"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusAvatar } from "@/components/ui/status-avatar";
import Link from "next/link";
import { Member } from "./types";

interface MemberCardProps {
  member: Member;
}

export function MemberCard({ member }: MemberCardProps) {
  // Prefer username for user-friendly URLs, fallback to user_id
  const profileUrl = member.profile?.username
    ? `/dashboard/profile/${member.profile.username}`
    : `/dashboard/profile/${member.user_id}`;

  // Display name: prefer full_name, fallback to username
  const displayName =
    member.profile?.full_name || member.profile?.username || "Unknown User";
  const avatarInitial =
    member.profile?.full_name?.[0] ||
    member.profile?.username?.[0]?.toUpperCase() ||
    "U";

  return (
    <Link
      href={profileUrl}
      className="block transition-transform hover:scale-105"
    >
      <Card className="cursor-pointer hover:shadow-md transition-shadow">
        <CardContent className="flex items-center gap-3 p-4">
          <StatusAvatar
            userId={member.user_id}
            src={member.profile?.avatar_url || ""}
            fallback={avatarInitial}
          />
          <div>
            <p className="font-medium text-sm">{displayName}</p>
            {member.profile?.username && member.profile?.full_name && (
              <p className="text-xs text-muted-foreground font-mono">
                @{member.profile.username}
              </p>
            )}
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
              {member.role}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
