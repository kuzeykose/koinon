"use client";

import { useEffect, useMemo, useState } from "react";
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
import useSWR from "swr";

const STATUS = {
  CHECKING: "checking",
  READY: "ready",
  SUBMITTING: "submitting",
  BLOCKED: "blocked",
} as const;

type StatusType = (typeof STATUS)[keyof typeof STATUS];

const DISABLE_STATES = new Set<StatusType>([
  STATUS.CHECKING,
  STATUS.SUBMITTING,
  STATUS.BLOCKED,
]);

export default function ResetConfirmPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<StatusType>(STATUS.CHECKING);
  const supabase = useMemo(() => createClient(), []);

  const fetcher = async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw new Error("No active session");
    }
    return data.session;
  };

  const { data: session, error, isLoading } = useSWR("reset-session", fetcher);

  useEffect(() => {
    if (error || (!isLoading && !session && status !== STATUS.BLOCKED)) {
      toast.error("Reset link is invalid or expired. Request a new one.");
      setStatus(STATUS.BLOCKED);
    } else if (session) {
      setStatus(STATUS.READY);
    }
  }, [session, error, isLoading]);

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

    setStatus(STATUS.SUBMITTING);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast.error(error.message || "Could not update password");
      setStatus(STATUS.READY);
      return;
    }

    router.push("/login");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4 dark:bg-black">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">
            Choose a new password
          </CardTitle>
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
                disabled={DISABLE_STATES.has(status)}
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
                disabled={DISABLE_STATES.has(status)}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              className="w-full"
              disabled={DISABLE_STATES.has(status)}
            >
              {status === STATUS.SUBMITTING && (
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
