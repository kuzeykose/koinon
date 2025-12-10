import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { BookOpen } from "lucide-react";
import { Profile, ReadingActivity } from "./types";

interface CommunityFeedProps {
  communityId: string;
}

const readingStatuses: Record<string, string> = {
  IS_READING: "Reading",
  COMPLETED: "Completed",
  PAUSED: "Paused",
  ABANDONED: "Abandoned",
};

export async function CommunityFeed({ communityId }: CommunityFeedProps) {
  const supabase = await createClient();

  // 1. Fetch Members to get IDs
  const { data: membersRaw } = await supabase
    .from("community_members")
    .select("user_id")
    .eq("community_id", communityId)
    .eq("status", "accepted");

  const memberIds = membersRaw?.map((m) => m.user_id) || [];

  if (memberIds.length === 0) {
    return (
      <div className="text-center py-12 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-dashed">
        <BookOpen className="h-10 w-10 text-zinc-300 mx-auto mb-3" />
        <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
          No activity yet
        </h3>
        <p className="text-zinc-500 text-sm">
          When members start reading books, they'll appear here.
        </p>
      </div>
    );
  }

  // 2. Fetch Profiles
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", memberIds);

  // 3. Fetch Reading Activities from user_books (merged table)
  const { data: readingData } = await supabase
    .from("user_books")
    .select(
      `
        id,
        user_id,
        status,
        progress,
        capacity,
        unit,
        synced_at,
        book:books (
          title,
          cover,
          authors
        )
      `
    )
    .in("user_id", memberIds)
    .order("synced_at", { ascending: false });

  const profilesMap = new Map(profiles?.map((p) => [p.id, p]) || []);

  const activities = (readingData?.map((item: any) => ({
    ...item,
    profile: profilesMap.get(item.user_id),
    updated_at: item.synced_at,
  })) || []) as ReadingActivity[];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {activities.length > 0 ? (
        activities.map((activity) => (
          <Card key={activity.id} className="overflow-hidden">
            <CardHeader className="flex flex-row items-center gap-4 pb-4">
              <Avatar>
                <AvatarImage src={activity.profile?.avatar_url || ""} />
                <AvatarFallback>
                  {activity.profile?.full_name?.[0] || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="font-semibold text-sm">
                  {activity.profile?.full_name || "Unknown Member"}
                </span>
                <span className="text-xs text-zinc-500">
                  {readingStatuses[activity.status] || activity.status}
                </span>
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-16 h-24 bg-zinc-100 rounded overflow-hidden">
                  {activity.book.cover ? (
                    <img
                      src={activity.book.cover}
                      alt={activity.book.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="h-6 w-6 text-zinc-300" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm line-clamp-2 mb-1">
                    {activity.book.title}
                  </h4>
                  {activity.book.authors && (
                    <p className="text-xs text-zinc-500 truncate">
                      {Array.isArray(activity.book.authors)
                        ? activity.book.authors
                            .map((a: any) => a.name)
                            .join(", ")
                        : "Unknown Author"}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1 mt-2">
                    <Badge variant="secondary" className="text-xs">
                      {readingStatuses[activity.status] || activity.status}
                    </Badge>
                    {activity.capacity && (
                      <Badge variant="outline" className="text-xs">
                        {activity.progress}/{activity.capacity}{" "}
                        {activity.unit || "pages"}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <div className="col-span-full text-center py-12 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-dashed">
          <BookOpen className="h-10 w-10 text-zinc-300 mx-auto mb-3" />
          <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
            No activity yet
          </h3>
          <p className="text-zinc-500 text-sm">
            When members start reading books, they'll appear here.
          </p>
        </div>
      )}
    </div>
  );
}
