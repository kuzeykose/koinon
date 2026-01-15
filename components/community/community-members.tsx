import { createClient } from "@/lib/supabase/server";
import { Member } from "./types";
import { MemberCard } from "./member-card";

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
      {members.map((member) => (
        <MemberCard key={member.user_id} member={member} />
      ))}
    </div>
  );
}
