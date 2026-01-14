import { CreateCommunityDialog } from "@/components/community/create-community-dialog";
import { CommunityCard } from "@/components/community/community-card";
import { createClient } from "@/lib/supabase/server";
import { Users } from "lucide-react";

interface Community {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  created_at: string;
  created_by: string;
  image_url: string | null;
  user_role?: string;
  member_count?: number;
}

export default async function CommunitiesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let communities: Community[] = [];

  if (user) {
    const { data, error } = await supabase
      .from("communities")
      .select(
        `
        *,
        community_members!inner (
          role,
          user_id
        )
      `
      )
      .eq("community_members.user_id", user.id);

    if (!error && data) {
      communities = data.map((item: any) => ({
        ...item,
        user_role: item.community_members[0].role,
        member_count: 1, // Placeholder
      }));
    }
  }

  return (
    <div className="container space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Communities</h1>
          <p className="text-muted-foreground mt-1">
            Join reading groups and share your progress with others.
          </p>
        </div>
        <CreateCommunityDialog />
      </div>

      {communities.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {communities.map((community) => (
            <CommunityCard key={community.id} community={community} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-muted/50 rounded-xl border border-dashed border-border">
          <div className="bg-muted p-4 rounded-full mb-4">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No communities yet</h3>
          <p className="text-muted-foreground max-w-sm mb-6">
            You haven't joined any communities yet. Create one to get started!
          </p>
          <CreateCommunityDialog />
        </div>
      )}
    </div>
  );
}
