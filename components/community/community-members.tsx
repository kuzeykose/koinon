import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Member } from "./types";

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

  // 2. Fetch Profiles
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", memberIds);

  const profilesMap = new Map(profiles?.map((p) => [p.id, p]) || []);

  const members = (membersRaw?.map((m) => ({
    ...m,
    profile: profilesMap.get(m.user_id),
  })) || []) as Member[];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {members.map((member) => (
        <Card key={member.user_id}>
          <CardContent className="flex items-center gap-3 p-4">
            <Avatar>
              <AvatarImage src={member.profile?.avatar_url || ""} />
              <AvatarFallback>
                {member.profile?.full_name?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">
                {member.profile?.full_name || "Unknown User"}
              </p>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                {member.role}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
