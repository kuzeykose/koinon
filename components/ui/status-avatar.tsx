"use client";

import * as React from "react";
import { Avatar, AvatarImage, AvatarFallback } from "./avatar";
import { usePresence, UserStatus } from "@/contexts/presence-context";
import { cn } from "@/lib/utils";

interface StatusAvatarProps {
  userId: string;
  src?: string;
  fallback?: string;
  showStatus?: boolean;
  className?: string;
  statusClassName?: string;
}

const statusColors: Record<UserStatus, string> = {
  online: "bg-green-500",
  reading: "bg-purple-500",
  offline: "",
};

export function StatusAvatar({
  userId,
  src,
  fallback = "U",
  showStatus = true,
  className,
  statusClassName,
}: StatusAvatarProps) {
  const { getUserStatus } = usePresence();
  const status = getUserStatus(userId);

  const showIndicator = showStatus && status !== "offline";

  return (
    <div className="relative inline-block">
      <Avatar className={className}>
        <AvatarImage src={src} />
        <AvatarFallback>{fallback}</AvatarFallback>
      </Avatar>
      {showIndicator && (
        <span
          className={cn(
            "absolute bottom-0 right-0 block h-1.5 w-1.5 rounded-full ring-2 ring-background",
            statusColors[status],
            statusClassName
          )}
          title={status === "reading" ? "Currently reading" : "Online"}
        />
      )}
    </div>
  );
}
