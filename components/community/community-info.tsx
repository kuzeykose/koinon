import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Community } from "./types";

interface CommunityInfoProps {
  communityId: string;
}

export async function CommunityInfo({ communityId }: CommunityInfoProps) {
  const supabase = await createClient();

  const { data: community } = await supabase
    .from("communities")
    .select("*")
    .eq("id", communityId)
    .single();

  if (!community) {
    return <div>Community not found.</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>About this Community</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-1">Description</h4>
            <p className="text-sm text-zinc-500">
              {community.description || "No description provided."}
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-4 border-t">
            <div className="flex items-center text-sm text-zinc-500">
              <Calendar className="mr-2 h-4 w-4" />
              <span>
                Created {formatDistanceToNow(new Date(community.created_at))}{" "}
                ago
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
