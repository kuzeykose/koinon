"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { Users, ArrowLeft } from "lucide-react";

interface Community {
  id: string;
  name: string;
  description: string | null;
  member_count?: number;
}

export default function JoinCommunityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const [community, setCommunity] = useState<Community | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCommunity = async () => {
      try {
        // Fetch community details
        const { data: communityData, error: communityError } = await supabase
          .from("communities")
          .select("*")
          .eq("id", id)
          .single();

        if (communityError) throw communityError;

        // Check if already a member
        if (user) {
          const { data: memberData } = await supabase
            .from("community_members")
            .select("id")
            .eq("community_id", id)
            .eq("user_id", user.id)
            .maybeSingle();

          if (memberData) {
            // Already a member, redirect
            toast.info("You are already a member of this community");
            router.push(`/dashboard/communities/${id}`);
            return;
          }
        }

        setCommunity(communityData);
      } catch (err) {
        console.error("Error fetching community:", err);
        setError("Community not found or failed to load.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCommunity();
  }, [id, user, router, supabase]);

  const handleJoin = async () => {
    if (!user) {
      toast.error("Please log in to join the community");
      // Redirect to login? Or show login modal?
      // For now, assume user is logged in because this is under dashboard (protected)
      // But if the link is shared publicly, they might need to login.
      // The dashboard layout might force login.
      return;
    }

    setIsJoining(true);
    try {
      const { error } = await supabase.from("community_members").insert({
        community_id: id,
        user_id: user.id,
        role: "member",
        status: "accepted",
      });

      if (error) throw error;

      toast.success(`Welcome to ${community?.name}!`);
      router.push(`/dashboard/communities/${id}`);
    } catch (error) {
      console.error("Error joining community:", error);
      toast.error("Failed to join community. Please try again.");
    } finally {
      setIsJoining(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        Loading...
      </div>
    );
  }

  if (error || !community) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <p className="text-red-500">{error || "Community not found"}</p>
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard/communities")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Communities
        </Button>
      </div>
    );
  }

  return (
    <div className="container flex items-center justify-center min-h-[calc(100vh-200px)] px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{community.name}</CardTitle>
          <CardDescription>{community.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <div className="h-16 w-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center">
            <Users className="h-8 w-8 text-zinc-500" />
          </div>
          <p className="text-center text-muted-foreground">
            You've been invited to join this community.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button
            className="w-full"
            size="lg"
            onClick={handleJoin}
            disabled={isJoining}
          >
            {isJoining ? "Joining..." : "Join Community"}
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => router.push("/dashboard/communities")}
          >
            Cancel
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
