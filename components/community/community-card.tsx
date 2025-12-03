import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Calendar } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface Community {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  member_count?: number;
  user_role?: string;
}

interface CommunityCardProps {
  community: Community;
}

export function CommunityCard({ community }: CommunityCardProps) {
  return (
    <Link href={`/dashboard/communities/${community.id}`}>
      <Card className="h-full hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer border-zinc-200 dark:border-zinc-800">
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle className="text-xl truncate">{community.name}</CardTitle>
            {community.user_role === "admin" && (
              <Badge variant="secondary" className="ml-2">
                Admin
              </Badge>
            )}
          </div>
          <CardDescription className="line-clamp-2 h-10">
            {community.description || "No description provided."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center text-sm text-zinc-500 dark:text-zinc-400 gap-4">
            <div className="flex items-center">
              <Users className="mr-1 h-4 w-4" />
              <span>
                {community.member_count !== undefined
                  ? community.member_count
                  : 1}{" "}
                members
              </span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="text-xs text-zinc-400 border-t pt-4">
          Created {formatDistanceToNow(new Date(community.created_at))} ago
        </CardFooter>
      </Card>
    </Link>
  );
}
