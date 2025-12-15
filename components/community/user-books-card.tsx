"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { BookOpen, MoreHorizontal, ChevronUp } from "lucide-react";
import { Profile, ReadingActivity } from "./types";

const BOOKS_TO_SHOW = 3;

const readingStatuses: Record<string, string> = {
  IS_READING: "Reading",
  COMPLETED: "Completed",
  PAUSED: "Paused",
  ABANDONED: "Abandoned",
};

interface UserBooksCardProps {
  user_id: string;
  profile: Profile | undefined;
  books: ReadingActivity[];
  totalBooks: number;
}

export function UserBooksCard({
  user_id,
  profile,
  books,
  totalBooks,
}: UserBooksCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const visibleBooks = isExpanded ? books : books.slice(0, BOOKS_TO_SHOW);
  const hasMore = totalBooks > BOOKS_TO_SHOW;

  return (
    <Card key={user_id} className="overflow-hidden">
      {/* User Header */}
      <CardHeader className="flex flex-row items-center gap-4 pb-4">
        <Avatar>
          <AvatarImage src={profile?.avatar_url || ""} />
          <AvatarFallback>{profile?.full_name?.[0] || "U"}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="font-semibold text-sm">
            {profile?.full_name || "Unknown Member"}
          </span>
          <span className="text-xs text-muted-foreground">
            {totalBooks} {totalBooks === 1 ? "book" : "books"}
          </span>
        </div>
      </CardHeader>

      {/* Books List */}
      <CardContent className="space-y-3 pb-4">
        {visibleBooks.map((activity) => (
          <div
            key={activity.id}
            className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
          >
            {/* Book Cover */}
            <div className="flex-shrink-0 w-10 h-14 bg-muted rounded overflow-hidden">
              {activity.book.cover ? (
                <img
                  src={activity.book.cover}
                  alt={activity.book.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Book Info */}
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm line-clamp-1">
                {activity.book.title}
              </h4>
              {activity.book.authors && (
                <p className="text-xs text-muted-foreground truncate">
                  {JSON.parse(activity.book.authors)
                    .map((a: any) => a.name)
                    .join(", ")}
                </p>
              )}

              {/* Progress Bar - only show when capacity exists and is > 0 */}
              {activity.capacity != null && activity.capacity > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          ((activity.progress || 0) / activity.capacity) * 100
                        )}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {activity.progress || 0}/{activity.capacity}
                  </span>
                </div>
              )}
            </div>

            {/* Status Badge */}
            <Badge variant="secondary" className="text-xs flex-shrink-0">
              {readingStatuses[activity.status] || activity.status}
            </Badge>
          </div>
        ))}

        {/* Show More / Show Less Button */}
        {hasMore && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex justify-center pt-2 cursor-pointer hover:opacity-70 transition-opacity"
          >
            <div className="flex flex-col items-center text-muted-foreground">
              {isExpanded ? (
                <>
                  <ChevronUp className="h-5 w-5" />
                  <span className="text-xs">Show less</span>
                </>
              ) : (
                <>
                  <MoreHorizontal className="h-5 w-5" />
                  <span className="text-xs">
                    +{totalBooks - BOOKS_TO_SHOW} more
                  </span>
                </>
              )}
            </div>
          </button>
        )}
      </CardContent>
    </Card>
  );
}
