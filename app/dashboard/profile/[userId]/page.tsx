import { createClient } from "@/lib/supabase/server";
import { ShelfView } from "@/components/shelf/shelf-view";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Lock, BookOpen, BookMarked, CheckCircle2 } from "lucide-react";
import { notFound } from "next/navigation";
import { isUUID } from "@/lib/utils";

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const supabase = await createClient();

  // Get current user
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  // Fetch target user's profile - support both UUID and username
  let profile;
  let profileError;

  if (isUUID(userId)) {
    // Lookup by UUID
    const result = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, is_public, username")
      .eq("id", userId)
      .single();
    profile = result.data;
    profileError = result.error;
  } else {
    // Lookup by username
    const result = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, is_public, username")
      .eq("username", userId)
      .single();
    profile = result.data;
    profileError = result.error;
  }

  if (profileError || !profile) {
    notFound();
  }

  // Check if the profile is the current user's own profile
  const isOwnProfile = currentUser?.id === profile.id;

  // Check if profile is public or if it's the user's own profile
  const canViewShelf = profile.is_public || isOwnProfile;

  // If allowed, fetch user's books
  let userBooks = null;
  let stats = {
    total: 0,
    reading: 0,
    completed: 0,
    wantToRead: 0,
  };

  if (canViewShelf) {
    const { data: books } = await supabase
      .from("user_books")
      .select("*")
      .eq("user_id", profile.id)
      .order("updated_at", { ascending: false });

    userBooks = books || [];

    // Calculate stats
    stats.total = userBooks.length;
    stats.reading = userBooks.filter((b) => b.status === "IS_READING").length;
    stats.completed = userBooks.filter((b) => b.status === "COMPLETED").length;
    stats.wantToRead = userBooks.filter(
      (b) => b.status === "WANT_TO_READ"
    ).length;
  }

  // Display name: prefer full_name, fallback to username
  const displayName = profile.full_name || profile.username || "Unknown User";
  const avatarInitial =
    profile.full_name?.[0] || profile.username?.[0]?.toUpperCase() || "U";

  return (
    <div className="min-h-screen bg-background">
      <main>
        {/* Profile Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile.avatar_url || ""} />
              <AvatarFallback className="text-2xl">
                {avatarInitial}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {displayName}
                {isOwnProfile && (
                  <span className="text-lg text-muted-foreground ml-2">
                    (You)
                  </span>
                )}
              </h1>
              {profile.username && profile.full_name && (
                <p className="text-sm text-muted-foreground font-mono">
                  @{profile.username}
                </p>
              )}
              <p className="text-muted-foreground">
                {profile.is_public ? "Public Profile" : "Private Profile"}
              </p>
            </div>
          </div>

          {/* Stats */}
          {canViewShelf && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-2xl font-bold">{stats.total}</p>
                      <p className="text-xs text-muted-foreground">
                        Total Books
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <BookMarked className="h-4 w-4 text-blue-500" />
                    <div>
                      <p className="text-2xl font-bold">{stats.reading}</p>
                      <p className="text-xs text-muted-foreground">Reading</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <div>
                      <p className="text-2xl font-bold">{stats.completed}</p>
                      <p className="text-xs text-muted-foreground">Completed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-orange-500" />
                    <div>
                      <p className="text-2xl font-bold">{stats.wantToRead}</p>
                      <p className="text-xs text-muted-foreground">
                        Want to Read
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Shelf Content or Private Message */}
        {canViewShelf ? (
          <div>
            <h2 className="text-2xl font-bold mb-4">
              {isOwnProfile ? "Your Shelf" : `${displayName}'s Shelf`}
            </h2>
            <ShelfView books={userBooks || []} readOnly={!isOwnProfile} />
          </div>
        ) : (
          <Alert className="max-w-2xl mx-auto">
            <Lock className="h-5 w-5" />
            <AlertTitle className="text-lg font-semibold">
              This shelf is private
            </AlertTitle>
            <AlertDescription className="text-base">
              {displayName} has not made their book shelf public. Only they can
              view their books and reading progress.
            </AlertDescription>
          </Alert>
        )}
      </main>
    </div>
  );
}
