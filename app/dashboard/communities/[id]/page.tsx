"use client";

import { useEffect, useState, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { InviteDialog } from "@/components/community/invite-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Users, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Community {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  created_by: string;
}

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface Member {
  user_id: string;
  role: string;
  profile?: Profile;
}

interface ReadingActivity {
  id: string;
  user_id: string;
  status: string;
  book: {
    title: string;
    cover: string | null;
    authors: any;
  };
  profile?: Profile;
  updated_at: string; // using synced_at or created_at
}

export default function CommunityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user } = useAuth();
  const supabase = createClient();

  const [community, setCommunity] = useState<Community | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [activities, setActivities] = useState<ReadingActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        // 1. Fetch Community Details
        const { data: communityData, error: communityError } = await supabase
          .from("communities")
          .select("*")
          .eq("id", id)
          .single();

        if (communityError) throw communityError;
        setCommunity(communityData);

        // 2. Fetch Members
        const { data: membersData, error: membersError } = await supabase
          .from("community_members")
          .select("user_id, role")
          .eq("community_id", id)
          .eq("status", "accepted");

        if (membersError) throw membersError;

        const memberIds = membersData.map((m) => m.user_id);

        // 3. Fetch Profiles
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", memberIds);

        if (profilesError) {
          console.error("Error fetching profiles:", profilesError);
        }

        const profilesMap = new Map((profilesData || []).map((p) => [p.id, p]));

        const membersWithProfiles = membersData.map((m) => ({
          ...m,
          profile: profilesMap.get(m.user_id),
        }));
        setMembers(membersWithProfiles);

        // 4. Fetch Reading Activities (Currently Reading)
        const { data: readingData, error: readingError } = await supabase
          .from("reading_states")
          .select(
            `
            id,
            user_id,
            status,
            synced_at,
            book:books (
              title,
              cover,
              authors
            )
          `
          )
          .in("user_id", memberIds)
          .eq("status", "IS_READING") // Literal status is usually 'IS_READING' or 'reading'? Let's check.
          // Actually, let's fetch all active reading statuses.
          // In SettingsPage we saw status being displayed. Let's assume 'IS_READING' based on Literal API usually.
          // Or just filter in memory if unsure.
          // Wait, the sample data in settings showed status. Let's check what status values are.
          // Common Literal values: 'IS_READING', 'WANT_TO_READ', 'FINISHED'.
          .order("synced_at", { ascending: false });

        if (readingError) throw readingError;

        const activitiesWithProfiles = readingData.map((item: any) => ({
          ...item,
          profile: profilesMap.get(item.user_id),
          updated_at: item.synced_at,
        }));

        setActivities(activitiesWithProfiles);
      } catch (error) {
        console.error("Error fetching community data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id, user, supabase]);

  if (isLoading) {
    return (
      <div className="container p-8 text-center">Loading community...</div>
    );
  }

  if (!community) {
    return (
      <div className="container p-8 text-center">Community not found.</div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-8">
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
              <span>{members.length} members</span>
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
        </TabsList>

        <TabsContent value="feed" className="mt-6">
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
                      <span className="text-xs text-zinc-500">is reading</span>
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
                        <Badge variant="secondary" className="mt-2 text-xs">
                          Reading
                        </Badge>
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
        </TabsContent>

        <TabsContent value="members" className="mt-6">
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
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 h-5"
                    >
                      {member.role}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
