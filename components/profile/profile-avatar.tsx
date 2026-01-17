"use client";

import { StatusAvatar } from "@/components/ui/status-avatar";

interface ProfileAvatarProps {
  userId: string;
  src?: string;
  fallback: string;
  className?: string;
}

export function ProfileAvatar({
  userId,
  src,
  fallback,
  className,
}: ProfileAvatarProps) {
  return (
    <StatusAvatar
      userId={userId}
      src={src}
      fallback={fallback}
      className={className}
      statusClassName="h-4 w-4"
    />
  );
}
