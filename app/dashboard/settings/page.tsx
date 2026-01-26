"use client";

import { useAuth } from "@/contexts/auth-context";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { validateUsername } from "@/lib/utils";
import { Check, Copy, Loader2 } from "lucide-react";
import {
  WEEK_START_DAYS,
  WEEK_START_DAY_LABELS,
  DEFAULT_WEEK_START_DAY,
  type WeekStartDay,
} from "@/lib/constants";

export default function SettingsPage() {
  const { user } = useAuth();
  const [isPublic, setIsPublic] = useState(false);
  const [isStatsPublic, setIsStatsPublic] = useState(false);
  const [weekStartDay, setWeekStartDay] = useState<WeekStartDay>(
    DEFAULT_WEEK_START_DAY
  );
  const [isLoading, setIsLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [originalUsername, setOriginalUsername] = useState("");
  const [usernameInput, setUsernameInput] = useState("");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<
    boolean | null
  >(null);
  const [isSavingUsername, setIsSavingUsername] = useState(false);
  const [copied, setCopied] = useState(false);
  const supabase = createClient();

  // Load profile data
  useEffect(() => {
    async function loadProfile() {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("is_public, is_stats_public, username, week_start_day")
        .eq("id", user.id)
        .single();

      if (!error && data) {
        setIsPublic(data.is_public || false);
        setIsStatsPublic(data.is_stats_public || false);
        setWeekStartDay(
          (data.week_start_day as WeekStartDay) || DEFAULT_WEEK_START_DAY
        );
        setUsername(data.username || "");
        setOriginalUsername(data.username || "");
        setUsernameInput(data.username || "");
      }
      setIsLoading(false);
    }

    loadProfile();
  }, [user?.id, supabase]);

  // Check username availability with debounce
  const checkUsernameAvailability = useCallback(
    async (newUsername: string) => {
      if (!newUsername || newUsername === originalUsername) {
        setIsUsernameAvailable(null);
        return;
      }

      const validation = validateUsername(newUsername);
      if (!validation.valid) {
        setUsernameError(validation.error || null);
        setIsUsernameAvailable(null);
        return;
      }

      setUsernameError(null);
      setIsCheckingUsername(true);

      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", newUsername)
        .neq("id", user?.id || "")
        .maybeSingle();

      setIsCheckingUsername(false);
      setIsUsernameAvailable(!data);
      if (data) {
        setUsernameError("This username is already taken");
      }
    },
    [supabase, user?.id, originalUsername]
  );

  // Debounce username check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (usernameInput !== originalUsername) {
        checkUsernameAvailability(usernameInput);
      } else {
        setUsernameError(null);
        setIsUsernameAvailable(null);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [usernameInput, originalUsername, checkUsernameAvailability]);

  // Handle username change
  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "");
    setUsernameInput(value);
  };

  // Save username
  const handleSaveUsername = async () => {
    if (!user?.id || !isUsernameAvailable) return;

    setIsSavingUsername(true);

    const { error } = await supabase
      .from("profiles")
      .update({ username: usernameInput })
      .eq("id", user.id);

    setIsSavingUsername(false);

    if (error) {
      console.error("Failed to update username:", error);
      toast.error("Failed to update username");
    } else {
      setUsername(usernameInput);
      setOriginalUsername(usernameInput);
      setIsUsernameAvailable(null);
      toast.success("Username updated successfully");
    }
  };

  // Handle toggle change for public profile
  const handleTogglePublic = async (checked: boolean) => {
    if (!user?.id) return;

    setIsPublic(checked);

    const { error } = await supabase
      .from("profiles")
      .update({ is_public: checked })
      .eq("id", user.id);

    if (error) {
      console.error("Failed to update profile:", error);
      setIsPublic(!checked); // Revert on error
      toast.error("Failed to update privacy settings");
    } else {
      toast.success(
        checked ? "Your shelf is now public" : "Your shelf is now private"
      );
    }
  };

  // Handle toggle change for public statistics
  const handleToggleStatsPublic = async (checked: boolean) => {
    if (!user?.id) return;

    setIsStatsPublic(checked);

    const { error } = await supabase
      .from("profiles")
      .update({ is_stats_public: checked })
      .eq("id", user.id);

    if (error) {
      console.error("Failed to update profile:", error);
      setIsStatsPublic(!checked); // Revert on error
      toast.error("Failed to update privacy settings");
    } else {
      toast.success(
        checked
          ? "Your statistics are now public"
          : "Your statistics are now private"
      );
    }
  };

  const handleWeekStartDayChange = async (day: string) => {
    if (!user?.id) return;

    const dayValue = day as WeekStartDay;
    if (!WEEK_START_DAYS.includes(dayValue)) {
      toast.error("Invalid week start day value");
      return;
    }

    const previousSelectedDay = weekStartDay;
    setWeekStartDay(dayValue);

    const { error } = await supabase
      .from("profiles")
      .update({ week_start_day: dayValue })
      .eq("id", user.id);

    if (error) {
      setWeekStartDay(previousSelectedDay);
      toast.error("Failed to update week start preference");
    } else {
      toast.success(`Week start changed to ${WEEK_START_DAY_LABELS[dayValue]}`);
    }
  };

  // Copy profile URL
  const copyProfileUrl = () => {
    const url = `${window.location.origin}/dashboard/profile/${username}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Profile URL copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const profileUrl = username
    ? `${
        typeof window !== "undefined" ? window.location.origin : ""
      }/dashboard/profile/${username}`
    : "";

  return (
    <div className="min-h-screen bg-background">
      <main className="container max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
          <p className="text-muted-foreground">Manage your account settings</p>
        </div>

        {/* Account Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your Koinon account details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label className="text-sm text-muted-foreground">
                  Full Name
                </Label>
                <p className="text-foreground font-mono text-sm">
                  {user?.user_metadata?.full_name}
                </p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Email</Label>
                <p className="text-foreground">{user?.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Username Settings */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Username</CardTitle>
            <CardDescription>
              Your unique username for your profile URL
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="username"
                    value={usernameInput}
                    onChange={handleUsernameChange}
                    placeholder="your_username"
                    className={
                      usernameError
                        ? "border-destructive pr-10"
                        : isUsernameAvailable
                        ? "border-green-500 pr-10"
                        : ""
                    }
                    disabled={isLoading}
                  />
                  {isCheckingUsername && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  {!isCheckingUsername && isUsernameAvailable && (
                    <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                  )}
                </div>
                <Button
                  onClick={handleSaveUsername}
                  disabled={
                    !isUsernameAvailable ||
                    isSavingUsername ||
                    usernameInput === originalUsername
                  }
                >
                  {isSavingUsername ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>
              {usernameError && (
                <p className="text-sm text-destructive">{usernameError}</p>
              )}
              <p className="text-sm text-muted-foreground">
                Only lowercase letters, numbers, and underscores. Must start
                with a letter.
              </p>
            </div>

            {/* Profile URL */}
            {username && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">
                  Your Profile URL
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={profileUrl}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyProfileUrl}
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Privacy Settings */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Privacy Settings</CardTitle>
            <CardDescription>
              Control who can view your book shelf and statistics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="public-profile" className="text-base">
                  Public Profile
                </Label>
                <p className="text-sm text-muted-foreground">
                  Allow other users to view your book shelf and reading progress
                </p>
              </div>
              <Switch
                id="public-profile"
                checked={isPublic}
                onCheckedChange={handleTogglePublic}
                disabled={isLoading}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="public-stats" className="text-base">
                  Public Statistics
                </Label>
                <p className="text-sm text-muted-foreground">
                  Allow other users to view your reading statistics and streaks
                </p>
              </div>
              <Switch
                id="public-stats"
                checked={isStatsPublic}
                onCheckedChange={handleToggleStatsPublic}
                disabled={isLoading}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Statistics Settings</CardTitle>
            <CardDescription>
              Customize how your reading statistics are calculated
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 my-6">
            <div className="space-y-2">
              <Label htmlFor="week-start" className="text-base">
                Week Start Day
              </Label>
              <p className="text-sm text-muted-foreground">
                Choose which day your week begins for &quot;This Week&quot; statistics
              </p>
              <Select
                value={weekStartDay}
                onValueChange={handleWeekStartDayChange}
                disabled={isLoading}
              >
                <SelectTrigger id="week-start" className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WEEK_START_DAYS.map((day) => (
                    <SelectItem key={day} value={day}>
                      {WEEK_START_DAY_LABELS[day]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
