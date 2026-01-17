"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "./auth-context";

export type UserStatus = "online" | "reading" | "offline";

interface UserPresence {
  userId: string;
  status: UserStatus;
  lastSeen: string;
}

type PresenceContextType = {
  onlineUsers: Map<string, UserPresence>;
  getUserStatus: (userId: string) => UserStatus;
  setStatus: (status: UserStatus) => Promise<boolean>;
  isLoading: boolean;
};

const PresenceContext = createContext<PresenceContextType | undefined>(
  undefined
);

const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const FETCH_INTERVAL = 60000; // 30 seconds
const ONLINE_THRESHOLD = 2 * 60 * 1000; // 2 minutes
const LOCAL_STATUS_KEY = "koinon_presence_status";
const SESSION_REFRESH_KEY = "koinon_is_refresh";

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<Map<string, UserPresence>>(
    new Map()
  );
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();
  const currentStatusRef = useRef<UserStatus | null>(null);
  const [hasLoadedStatus, setHasLoadedStatus] = useState(false);

  // Update current user's presence (heartbeat)
  // Skip heartbeat if user manually set themselves to offline
  const updatePresence = useCallback(async () => {
    if (!user) return;
    const currentStatus = currentStatusRef.current;
    if (!currentStatus) return;
    if (currentStatus === "offline") return; // Don't update if manually offline

    try {
      await supabase
        .from("profiles")
        .update({
          last_seen: new Date().toISOString(),
          status: currentStatus,
        })
        .eq("id", user.id);
    } catch (error) {
      console.error("Failed to update presence:", error);
    }
  }, [user, supabase]);

  // Hydrate current status from localStorage preference or database
  // localStorage stores the user's preferred status (online/reading)
  // When user returns to the page, we restore their preference automatically
  useEffect(() => {
    let isActive = true;

    const loadCurrentStatus = async () => {
      if (!user) {
        if (isActive) {
          currentStatusRef.current = null;
          setHasLoadedStatus(true);
        }
        return;
      }

      try {
        currentStatusRef.current = null;

        // Check if this is a page refresh using sessionStorage
        // sessionStorage persists across refreshes but is cleared when browser/tab is closed
        const isRefresh = sessionStorage.getItem(SESSION_REFRESH_KEY);
        
        // Check localStorage for stored status preference
        // localStorage persists even after browser close
        const storedPreference = localStorage.getItem(LOCAL_STATUS_KEY);
        
        if (isRefresh) {
          // This is a refresh - just restore from localStorage preference
          sessionStorage.removeItem(SESSION_REFRESH_KEY);
        }

        // If user has a stored preference (online/reading), restore it
        if (
          storedPreference === "online" ||
          storedPreference === "reading"
        ) {
          currentStatusRef.current = storedPreference as UserStatus;
          
          // Update the database with the restored status
          await supabase
            .from("profiles")
            .update({
              status: storedPreference,
              last_seen: new Date().toISOString(),
            })
            .eq("id", user.id);
          
          if (isActive) {
            setHasLoadedStatus(true);
          }
          return;
        }

        // No stored preference or preference is offline - load from database
        const { data, error } = await supabase
          .from("profiles")
          .select("status")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("Failed to load current status:", error);
          return;
        }

        if (isActive) {
          const persistedStatus = data?.status as UserStatus | null;
          if (
            persistedStatus === "online" ||
            persistedStatus === "reading" ||
            persistedStatus === "offline"
          ) {
            currentStatusRef.current = persistedStatus;
          } else {
            // Default to offline until user explicitly opts in.
            currentStatusRef.current = "offline";
          }
        }
      } catch (error) {
        console.error("Failed to load current status:", error);
      } finally {
        if (isActive) {
          setHasLoadedStatus(true);
        }
      }
    };

    setHasLoadedStatus(false);
    loadCurrentStatus();

    return () => {
      isActive = false;
    };
  }, [user, supabase]);

  // Fetch all online users
  const fetchOnlineUsers = useCallback(async () => {
    try {
      const threshold = new Date(Date.now() - ONLINE_THRESHOLD).toISOString();

      const { data, error } = await supabase
        .from("profiles")
        .select("id, status, last_seen")
        .gte("last_seen", threshold);

      if (error) {
        console.error("Failed to fetch online users:", error);
        return;
      }

      const newOnlineUsers = new Map<string, UserPresence>();
      data?.forEach((profile) => {
        newOnlineUsers.set(profile.id, {
          userId: profile.id,
          status: profile.status as UserStatus,
          lastSeen: profile.last_seen,
        });
      });

      setOnlineUsers(newOnlineUsers);
    } catch (error) {
      console.error("Failed to fetch online users:", error);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  // Get status for a specific user
  const getUserStatus = useCallback(
    (userId: string): UserStatus => {
      const presence = onlineUsers.get(userId);
      if (!presence) return "offline";

      // If user manually set themselves offline, respect that
      if (presence.status === "offline") return "offline";

      const lastSeenTime = new Date(presence.lastSeen).getTime();
      const isRecent = Date.now() - lastSeenTime < ONLINE_THRESHOLD;

      if (!isRecent) return "offline";
      return presence.status === "reading" ? "reading" : "online";
    },
    [onlineUsers]
  );

  // Set current user's status
  const setStatus = useCallback(
    async (status: UserStatus) => {
      if (!user) return false;

      try {
        const now = new Date().toISOString();
        const { data, error } = await supabase
          .from("profiles")
          .update({
            status,
            last_seen: now,
          })
          .eq("id", user.id)
          .select("id");

        if (error || !data || data.length === 0) {
          console.error("Failed to set status:", error);
          return false;
        }

        currentStatusRef.current = status;

        // Store preference in localStorage
        // When user sets online/reading, save it so we can restore on next visit
        // When user sets offline, remove the preference
        if (status === "online" || status === "reading") {
          localStorage.setItem(LOCAL_STATUS_KEY, status);
        } else {
          localStorage.removeItem(LOCAL_STATUS_KEY);
        }

        // Update local state immediately
        setOnlineUsers((prev) => {
          const newMap = new Map(prev);
          newMap.set(user.id, {
            userId: user.id,
            status,
            lastSeen: now,
          });
          return newMap;
        });
        return true;
      } catch (error) {
        console.error("Failed to set status:", error);
        return false;
      }
    },
    [user, supabase]
  );

  // Set up heartbeat and fetch intervals
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    if (!hasLoadedStatus) {
      return;
    }

    // Initial presence update and fetch
    updatePresence();
    fetchOnlineUsers();

    // Set up intervals
    const heartbeatInterval = setInterval(updatePresence, HEARTBEAT_INTERVAL);
    const fetchInterval = setInterval(fetchOnlineUsers, FETCH_INTERVAL);

    // Cleanup on unmount - set status to offline
    return () => {
      clearInterval(heartbeatInterval);
      clearInterval(fetchInterval);
    };
  }, [user, hasLoadedStatus, updatePresence, fetchOnlineUsers]);

  // Handle page visibility changes
  useEffect(() => {
    if (!user || !hasLoadedStatus) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Only update presence if not manually offline
        if (currentStatusRef.current !== "offline") {
          updatePresence();
        }
        fetchOnlineUsers();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user, hasLoadedStatus, updatePresence, fetchOnlineUsers]);

  // Handle browser/tab close - set status to offline in database
  // Use sessionStorage to detect refresh vs actual close
  useEffect(() => {
    if (!user || !hasLoadedStatus) return;

    const handleBeforeUnload = () => {
      const currentStatus = currentStatusRef.current;
      
      // Mark that this is a refresh/navigation (sessionStorage persists on refresh)
      // This flag will be cleared when browser/tab is actually closed
      sessionStorage.setItem(SESSION_REFRESH_KEY, "true");

      // Only set offline in DB if not already offline
      if (currentStatus === "offline") return;

      // Use sendBeacon for reliable delivery during page unload
      // sendBeacon includes cookies automatically for same-origin requests
      const body = JSON.stringify({ status: "offline" });

      // sendBeacon is the most reliable way to send data during page unload
      // This sets offline in DB, but localStorage keeps the preference
      // so on next page load, the preference is restored
      navigator.sendBeacon(
        "/api/presence",
        new Blob([body], { type: "application/json" })
      );
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [user, hasLoadedStatus]);

  return (
    <PresenceContext.Provider
      value={{ onlineUsers, getUserStatus, setStatus, isLoading }}
    >
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresence() {
  const context = useContext(PresenceContext);
  if (context === undefined) {
    throw new Error("usePresence must be used within a PresenceProvider");
  }
  return context;
}
