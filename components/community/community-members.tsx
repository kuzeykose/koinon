import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Member } from "./types";
import Link from "next/link";

interface CommunityMembersProps {
  communityId: string;
}

export async function CommunityMembers({ communityId }: CommunityMembersProps) {
  const supabase = await createClient();

  // 1. Fetch Members
  const { data: membersRaw } = await supabase
    .from("community_members")
    .select("user_id, role")
    .eq("community_id", communityId)
    .eq("status", "accepted");

  const memberIds = membersRaw?.map((m) => m.user_id) || [];

  if (memberIds.length === 0) {
    return <div className="text-center py-8">No members found.</div>;
  }

  // 2. Fetch Profiles (including username for URL generation)
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, username")
    .in("id", memberIds);

  const profilesMap = new Map(profiles?.map((p) => [p.id, p]) || []);

  const members = (membersRaw?.map((m) => ({
    ...m,
    profile: profilesMap.get(m.user_id),
  })) || []) as Member[];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {members.map((member) => {
        // Prefer username for user-friendly URLs, fallback to user_id
        const profileUrl = member.profile?.username
          ? `/dashboard/profile/${member.profile.username}`
          : `/dashboard/profile/${member.user_id}`;

        // Display name: prefer full_name, fallback to username
        const displayName =
          member.profile?.full_name ||
          member.profile?.username ||
          "Unknown User";
        const avatarInitial =
          member.profile?.full_name?.[0] ||
          member.profile?.username?.[0]?.toUpperCase() ||
          "U";

        return (
          <Link
            key={member.user_id}
            href={profileUrl}
            className="block transition-transform hover:scale-105"
          >
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="flex items-center gap-3 p-4">
                <Avatar>
                  <AvatarImage src={member.profile?.avatar_url || ""} />
                  <AvatarFallback>{avatarInitial}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">{displayName}</p>
                  {member.profile?.username && member.profile?.full_name && (
                    <p className="text-xs text-muted-foreground font-mono">
                      @{member.profile.username}
                    </p>
                  )}
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 h-5"
                  >
                    {member.role}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
