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
  setStatus: (status: UserStatus) => Promise<void>;
  isLoading: boolean;
};

const PresenceContext = createContext<PresenceContextType | undefined>(
  undefined
);

const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const FETCH_INTERVAL = 30000; // 30 seconds
const ONLINE_THRESHOLD = 2 * 60 * 1000; // 2 minutes

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<Map<string, UserPresence>>(
    new Map()
  );
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();
  const currentStatusRef = useRef<UserStatus>("online");

  // Update current user's presence (heartbeat)
  // Skip heartbeat if user manually set themselves to offline
  const updatePresence = useCallback(async () => {
    if (!user) return;
    if (currentStatusRef.current === "offline") return; // Don't update if manually offline

    try {
      await supabase
        .from("profiles")
        .update({
          last_seen: new Date().toISOString(),
          status: currentStatusRef.current,
        })
        .eq("id", user.id);
    } catch (error) {
      console.error("Failed to update presence:", error);
    }
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
      if (!user) return;

      currentStatusRef.current = status;

      try {
        await supabase
          .from("profiles")
          .update({
            status,
            last_seen: new Date().toISOString(),
          })
          .eq("id", user.id);

        // Update local state immediately
        setOnlineUsers((prev) => {
          const newMap = new Map(prev);
          newMap.set(user.id, {
            userId: user.id,
            status,
            lastSeen: new Date().toISOString(),
          });
          return newMap;
        });
      } catch (error) {
        console.error("Failed to set status:", error);
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
  }, [user, updatePresence, fetchOnlineUsers]);

  // Handle page visibility changes
  useEffect(() => {
    if (!user) return;

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
  }, [user, updatePresence, fetchOnlineUsers]);

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
