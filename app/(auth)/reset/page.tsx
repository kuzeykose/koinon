"use client";

import { useState } from "react";
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
  Idle = "idle",
  Loading = "loading",
  Sent = "sent",
}

export default function ResetRequestPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    | { state: Status.Idle }
    | { state: Status.Loading }
    | { state: Status.Sent }
  >({ state: Status.Idle });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ state: Status.Loading });

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset/confirm`,
    });

    if (error) {
      setStatus({ state: Status.Idle });
      toast.error(error.message || "Unable to send reset link");
    } else {
      setStatus({ state: Status.Sent });
    }
  };

  if (status.state === Status.Sent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4 dark:bg-black">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Check your email</CardTitle>
            <CardDescription>We&apos;ve sent a password reset link.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4 dark:bg-black">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Reset password</CardTitle>
          <CardDescription>
            Enter your account email to receive a reset link.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={status.state === Status.Loading}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              className="w-full"
              disabled={status.state === Status.Loading}
            >
              {status.state === Status.Loading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Send reset link
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
