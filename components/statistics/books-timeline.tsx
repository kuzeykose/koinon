"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, CheckCircle2 } from "lucide-react";

interface CompletedBook {
  id: string;
  title: string;
  cover?: string | null;
  completedAt: string;
}

interface BooksTimelineProps {
  completedBooks: CompletedBook[];
}

export function BooksTimeline({ completedBooks }: BooksTimelineProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          Completed Books
        </CardTitle>
      </CardHeader>
      <CardContent>
        {completedBooks.length > 0 ? (
          <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
            {completedBooks.slice(0, 10).map((book, index) => (
              <div key={book.id} className="flex items-center gap-3 group">
                {/* Book cover */}
                <div className="flex-shrink-0 w-10 h-14 bg-muted rounded overflow-hidden">
                  {book.cover ? (
                    <img
                      src={book.cover}
                      alt={book.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Book info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                    {book.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Completed {formatDate(book.completedAt)}
                  </p>
                </div>

                {/* Order indicator */}
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-medium flex items-center justify-center">
                  {index + 1}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No books completed yet</p>
            <p className="text-xs mt-1">
              Keep reading to see your achievements here!
            </p>
          </div>
        )}

        {completedBooks.length > 10 && (
          <p className="text-xs text-muted-foreground text-center mt-4">
            Showing 10 of {completedBooks.length} completed books
          </p>
        )}
      </CardContent>
    </Card>
  );
}
