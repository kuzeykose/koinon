"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, Square, RotateCcw, Settings, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { usePresence } from "@/contexts/presence-context";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";

interface UserBook {
  id: string;
  title: string;
  cover: string | null;
  authors: { name: string }[] | null;
}

type TimerState = "idle" | "running" | "paused";
type SessionType = "work" | "break";

const LOCAL_SETTINGS_KEY = "pomodoro_settings";

interface PomodoroSettings {
  workDuration: number; // in minutes
  breakDuration: number; // in minutes
}

const DEFAULT_SETTINGS: PomodoroSettings = {
  workDuration: 25,
  breakDuration: 5,
};

interface PomodoroTimerProps {
  books: UserBook[];
}

export function PomodoroTimer({ books }: PomodoroTimerProps) {
  const { user } = useAuth();
  const { setStatus, getUserStatus } = usePresence();

  // Settings state
  const [settings, setSettings] = useState<PomodoroSettings>(DEFAULT_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tempSettings, setTempSettings] = useState<PomodoroSettings>(DEFAULT_SETTINGS);

  // Timer state
  const [timerState, setTimerState] = useState<TimerState>("idle");
  const [sessionType, setSessionType] = useState<SessionType>("work");
  const [timeRemaining, setTimeRemaining] = useState(settings.workDuration * 60); // in seconds
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Refs for interval and previous status
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousStatusRef = useRef<string | null>(null);
  const notificationPermissionRef = useRef<NotificationPermission>("default");

  // Load settings from localStorage and reset status if needed
  useEffect(() => {
    const stored = localStorage.getItem(LOCAL_SETTINGS_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as PomodoroSettings;
        setSettings(parsed);
        setTempSettings(parsed);
        // Only update time if timer is idle
        if (timerState === "idle") {
          setTimeRemaining(parsed.workDuration * 60);
        }
      } catch {
        // Use defaults
      }
    }
    // Check notification permission
    if ("Notification" in window) {
      notificationPermissionRef.current = Notification.permission;
    }

    // Reset status to online if user is in "reading" status but timer is idle
    // This handles the case where page was refreshed during an active session
    if (user && timerState === "idle") {
      const currentStatus = getUserStatus(user.id);
      if (currentStatus === "reading") {
        setStatus("online");
      }
    }
  }, []);

  // Request notification permission
  const requestNotificationPermission = useCallback(async () => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      notificationPermissionRef.current = permission;
    }
  }, []);

  // Show notification
  const showNotification = useCallback((title: string, body: string) => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
      new Notification(title, {
        body,
        icon: "/favicon.ico",
        tag: "pomodoro",
      });
    }
  }, []);

  // Create session in database
  const createSession = useCallback(async (
    durationMinutes: number,
    type: SessionType,
    bookId: string | null
  ): Promise<string | null> => {
    try {
      const response = await fetch("/api/pomodoro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          duration_minutes: durationMinutes,
          session_type: type,
          user_book_id: bookId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create session");
      }

      const data = await response.json();
      return data.session?.id || null;
    } catch (error) {
      console.error("Failed to create pomodoro session:", error);
      return null;
    }
  }, []);

  // Update session in database
  const updateSession = useCallback(async (sessionId: string, completed: boolean) => {
    try {
      await fetch("/api/pomodoro", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          completed,
        }),
      });
    } catch (error) {
      console.error("Failed to update pomodoro session:", error);
    }
  }, []);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Calculate progress percentage
  const getProgress = (): number => {
    const totalSeconds =
      sessionType === "work"
        ? settings.workDuration * 60
        : settings.breakDuration * 60;
    return ((totalSeconds - timeRemaining) / totalSeconds) * 100;
  };

  // Handle timer completion
  const handleTimerComplete = useCallback(async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Mark session as completed
    if (currentSessionId) {
      await updateSession(currentSessionId, true);
      setCurrentSessionId(null);
    }

    // Show notification and toast
    if (sessionType === "work") {
      showNotification("Work Session Complete!", "Time for a break.");
      toast.success("Work session complete! Time for a break.");

      // Revert status after work session (only if we changed it)
      // If previousStatusRef is null, it means user was offline and we didn't change status
      if (previousStatusRef.current) {
        await setStatus(previousStatusRef.current as "online" | "offline");
        previousStatusRef.current = null;
      }
    } else {
      showNotification("Break Over!", "Ready to focus?");
      toast.success("Break over! Ready to focus?");
    }

    // Switch to next session type
    const nextType: SessionType = sessionType === "work" ? "break" : "work";
    setSessionType(nextType);
    setTimeRemaining(
      nextType === "work"
        ? settings.workDuration * 60
        : settings.breakDuration * 60
    );
    setTimerState("idle");
  }, [sessionType, settings, currentSessionId, updateSession, setStatus, showNotification]);

  // Timer tick effect
  useEffect(() => {
    if (timerState === "running" && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [timerState, handleTimerComplete]);

  // Start timer
  const handleStart = async () => {
    await requestNotificationPermission();

    // Set status to reading for work sessions (only if not offline)
    if (sessionType === "work" && user) {
      const currentStatus = getUserStatus(user.id);

      // Respect user's offline status - don't change it
      if (currentStatus !== "offline") {
        previousStatusRef.current = currentStatus;

        // Save "online" to localStorage before changing to "reading"
        // This ensures that if the page is closed/refreshed during the session,
        // the status will restore to "online" instead of staying as "reading"
        if (currentStatus === "online") {
          localStorage.setItem("koinon_presence_status", "online");
        }

        await setStatus("reading");
      }
    }

    // Create session in database
    const sessionId = await createSession(
      sessionType === "work" ? settings.workDuration : settings.breakDuration,
      sessionType,
      selectedBookId
    );
    setCurrentSessionId(sessionId);

    setTimerState("running");
  };

  // Pause timer
  const handlePause = () => {
    setTimerState("paused");
  };

  // Resume timer
  const handleResume = () => {
    setTimerState("running");
  };

  // Stop timer
  const handleStop = async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Mark session as incomplete
    if (currentSessionId) {
      await updateSession(currentSessionId, false);
      setCurrentSessionId(null);
    }

    // Revert status (only if we changed it)
    // If previousStatusRef is null, it means user was offline and we didn't change status
    if (sessionType === "work" && previousStatusRef.current) {
      await setStatus(previousStatusRef.current as "online" | "offline");
      previousStatusRef.current = null;
    }

    setTimerState("idle");
    setTimeRemaining(
      sessionType === "work"
        ? settings.workDuration * 60
        : settings.breakDuration * 60
    );
  };

  // Reset timer
  const handleReset = () => {
    setTimeRemaining(
      sessionType === "work"
        ? settings.workDuration * 60
        : settings.breakDuration * 60
    );
  };

  // Switch session type (only when idle)
  const handleSessionTypeChange = (type: SessionType) => {
    if (timerState !== "idle") return;
    setSessionType(type);
    setTimeRemaining(
      type === "work" ? settings.workDuration * 60 : settings.breakDuration * 60
    );
  };

  // Save settings
  const handleSaveSettings = () => {
    setSettings(tempSettings);
    localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(tempSettings));

    // Update time remaining if idle
    if (timerState === "idle") {
      setTimeRemaining(
        sessionType === "work"
          ? tempSettings.workDuration * 60
          : tempSettings.breakDuration * 60
      );
    }

    setSettingsOpen(false);
    toast.success("Settings saved");
  };

  const selectedBook = books.find((b) => b.id === selectedBookId);

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Session Type Toggle */}
      <div className="flex gap-2">
        <Button
          variant={sessionType === "work" ? "default" : "outline"}
          onClick={() => handleSessionTypeChange("work")}
          disabled={timerState !== "idle"}
        >
          Work
        </Button>
        <Button
          variant={sessionType === "break" ? "default" : "outline"}
          onClick={() => handleSessionTypeChange("break")}
          disabled={timerState !== "idle"}
        >
          Break
        </Button>
      </div>

      {/* Timer Display */}
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-lg text-muted-foreground">
            {sessionType === "work" ? "Focus Time" : "Break Time"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6">
          {/* Circular Progress Timer */}
          <div className="relative">
            <svg className="w-64 h-64 transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="128"
                cy="128"
                r="120"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-muted"
              />
              {/* Progress circle */}
              <circle
                cx="128"
                cy="128"
                r="120"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 120}
                strokeDashoffset={2 * Math.PI * 120 * (1 - getProgress() / 100)}
                className={cn(
                  "transition-all duration-1000",
                  sessionType === "work" ? "text-purple-500" : "text-green-500"
                )}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-mono font-bold tabular-nums">
                {formatTime(timeRemaining)}
              </span>
              <span className="text-sm text-muted-foreground mt-2">
                {timerState === "running"
                  ? "Running"
                  : timerState === "paused"
                    ? "Paused"
                    : "Ready"}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-3">
            {timerState === "idle" && (
              <Button size="lg" onClick={handleStart}>
                <Play className="mr-2 h-5 w-5" />
                Start
              </Button>
            )}
            {timerState === "running" && (
              <>
                <Button size="lg" variant="outline" onClick={handlePause}>
                  <Pause className="mr-2 h-5 w-5" />
                  Pause
                </Button>
                <Button size="lg" variant="destructive" onClick={handleStop}>
                  <Square className="mr-2 h-5 w-5" />
                  Stop
                </Button>
              </>
            )}
            {timerState === "paused" && (
              <>
                <Button size="lg" onClick={handleResume}>
                  <Play className="mr-2 h-5 w-5" />
                  Resume
                </Button>
                <Button size="lg" variant="outline" onClick={handleReset}>
                  <RotateCcw className="mr-2 h-5 w-5" />
                  Reset
                </Button>
                <Button size="lg" variant="destructive" onClick={handleStop}>
                  <Square className="mr-2 h-5 w-5" />
                  Stop
                </Button>
              </>
            )}
          </div>

          {/* Book Selection */}
          {sessionType === "work" && (
            <div className="w-full space-y-2">
              <Label className="text-sm text-muted-foreground flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Reading (optional)
              </Label>
              <Select
                value={selectedBookId || "none"}
                onValueChange={(value) =>
                  setSelectedBookId(value === "none" ? null : value)
                }
                disabled={timerState !== "idle"}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a book...">
                    {selectedBook ? (
                      <span className="truncate">{selectedBook.title}</span>
                    ) : (
                      "No book selected"
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No book selected</SelectItem>
                  {books.map((book) => (
                    <SelectItem key={book.id} value={book.id}>
                      <span className="truncate">{book.title}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" disabled={timerState !== "idle"}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Timer Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="work-duration">Work Duration (minutes)</Label>
              <Input
                id="work-duration"
                type="number"
                min={1}
                max={120}
                value={tempSettings.workDuration}
                onChange={(e) =>
                  setTempSettings((prev) => ({
                    ...prev,
                    workDuration: parseInt(e.target.value) || 25,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="break-duration">Break Duration (minutes)</Label>
              <Input
                id="break-duration"
                type="number"
                min={1}
                max={60}
                value={tempSettings.breakDuration}
                onChange={(e) =>
                  setTempSettings((prev) => ({
                    ...prev,
                    breakDuration: parseInt(e.target.value) || 5,
                  }))
                }
              />
            </div>
            <Button onClick={handleSaveSettings} className="w-full">
              Save Settings
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
