"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

enum Status {
  Checking = "checking",
  Ready = "ready",
  Submitting = "submitting",
  Blocked = "blocked",
}

export default function ResetConfirmPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<
    | { state: Status.Checking }
    | { state: Status.Ready }
    | { state: Status.Submitting }
    | { state: Status.Blocked }
  >({ state: Status.Checking });

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        toast.error("Reset link is invalid or expired. Request a new one.");
        setStatus({ state: Status.Blocked });
        return;
      }
      setStatus({ state: Status.Ready });
    };

    void checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setStatus({ state: Status.Submitting });
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast.error(error.message || "Could not update password");
      setStatus({ state: Status.Ready });
      return;
    }

    router.push("/login");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4 dark:bg-black">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Choose a new password</CardTitle>
          <CardDescription>
            After submitting you&apos;ll be redirected to sign in.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                disabled={
                  status.state === Status.Submitting ||
                  status.state === Status.Checking ||
                  status.state === Status.Blocked
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={6}
                disabled={
                  status.state === Status.Submitting ||
                  status.state === Status.Checking ||
                  status.state === Status.Blocked
                }
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              className="w-full"
              disabled={
                status.state === Status.Submitting ||
                status.state === Status.Checking ||
                status.state === Status.Blocked
              }
            >
              {status.state === Status.Submitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )} 
              Update password
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
