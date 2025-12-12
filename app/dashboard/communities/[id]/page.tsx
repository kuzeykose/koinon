import { createClient } from "@/lib/supabase/server";
import { InviteDialog } from "@/components/community/invite-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { CommunityFeed } from "@/components/community/community-feed";
import { CommunityMembers } from "@/components/community/community-members";
import { CommunityInfo } from "@/components/community/community-info";
import { Community } from "@/components/community/types";

export default async function CommunityPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  const { page } = await searchParams;
  const currentPage = page ? parseInt(page, 10) : 1;
  const supabase = await createClient();

  // 1. Fetch Community Details
  const { data: community } = await supabase
    .from("communities")
    .select("*")
    .eq("id", id)
    .single();

  // 2. Fetch Member Count
  const { count: memberCount } = await supabase
    .from("community_members")
    .select("*", { count: "exact", head: true })
    .eq("community_id", id)
    .eq("status", "accepted");

  if (!community) {
    return (
      <div className="container p-8 text-center">Community not found.</div>
    );
  }

  return (
    <div className="container max-w-6xl space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {community.name}
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            {community.description || "No description provided."}
          </p>
          <div className="flex items-center gap-4 mt-4 text-sm text-zinc-500">
            <div className="flex items-center">
              <Users className="mr-1 h-4 w-4" />
              <span>{memberCount || 0} members</span>
            </div>
            <div className="flex items-center">
              <Calendar className="mr-1 h-4 w-4" />
              <span>
                Created {formatDistanceToNow(new Date(community.created_at))}{" "}
                ago
              </span>
            </div>
          </div>
        </div>
        <InviteDialog
          communityId={community.id}
          communityName={community.name}
        />
      </div>

      {/* Content */}
      <Tabs defaultValue="feed" className="w-full">
        <TabsList>
          <TabsTrigger value="feed">Community Feed</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="information">Information</TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="mt-6">
          <CommunityFeed communityId={id} page={currentPage} />
        </TabsContent>

        <TabsContent value="members" className="mt-6">
          <CommunityMembers communityId={id} />
        </TabsContent>

        <TabsContent value="information" className="mt-6">
          <CommunityInfo communityId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
