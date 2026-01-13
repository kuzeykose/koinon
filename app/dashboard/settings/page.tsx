"use client";

import { useAuth } from "@/contexts/auth-context";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function SettingsPage() {
  const { user } = useAuth();
  const [isPublic, setIsPublic] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  // Load profile data
  useEffect(() => {
    async function loadProfile() {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("is_public")
        .eq("id", user.id)
        .single();

      if (!error && data) {
        setIsPublic(data.is_public || false);
      }
      setIsLoading(false);
    }

    loadProfile();
  }, [user?.id, supabase]);

  // Handle toggle change
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
            <div className="space-y-3">
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

        {/* Privacy Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Privacy Settings</CardTitle>
            <CardDescription>
              Control who can view your book shelf
            </CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
