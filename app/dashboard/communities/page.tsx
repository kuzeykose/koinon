"use client";

import { useEffect, useState } from "react";
import { CreateCommunityDialog } from "@/components/community/create-community-dialog";
import { CommunityCard } from "@/components/community/community-card";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { Skeleton } from "@/components/ui/skeleton";
import { Users } from "lucide-react";

interface Community {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  created_by: string;
  image_url: string | null;
  user_role?: string;
  member_count?: number;
}

export default function CommunitiesPage() {
  const { user } = useAuth();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchCommunities = async () => {
      if (!user) return;

      try {
        // Fetch communities where the user is a member
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

        if (error) {
          console.error("Error fetching communities:", error);
          return;
        }

        // Transform data to include role
        const transformedCommunities = data.map((item: any) => ({
          ...item,
          user_role: item.community_members[0].role,
          member_count: 1, // Placeholder, would need a separate count query or aggregation
        }));

        setCommunities(transformedCommunities);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCommunities();
  }, [user]);

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Communities</h1>
          <p className="text-muted-foreground mt-1">
            Join reading groups and share your progress with others.
          </p>
        </div>
        <CreateCommunityDialog />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[200px] w-full rounded-xl" />
          ))}
        </div>
      ) : communities.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {communities.map((community) => (
            <CommunityCard key={community.id} community={community} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
          <div className="bg-zinc-100 dark:bg-zinc-800 p-4 rounded-full mb-4">
            <Users className="h-8 w-8 text-zinc-400" />
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
