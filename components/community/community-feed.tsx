import { createClient } from "@/lib/supabase/server";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { BookOpen } from "lucide-react";
import { Profile, ReadingActivity } from "./types";
import { UserBooksCard } from "./user-books-card";

const USERS_PER_PAGE = 6;

interface CommunityFeedProps {
  communityId: string;
  page?: number;
}

interface UserWithBooks {
  user_id: string;
  profile: Profile | undefined;
  books: ReadingActivity[];
  totalBooks: number;
}

export async function CommunityFeed({
  communityId,
  page = 1,
}: CommunityFeedProps) {
  const supabase = await createClient();
  const currentPage = Math.max(1, page);

  // 1. Fetch Members to get IDs
  const { data: membersRaw } = await supabase
    .from("community_members")
    .select("user_id")
    .eq("community_id", communityId)
    .eq("status", "accepted");

  const memberIds = membersRaw?.map((m) => m.user_id) || [];

  if (memberIds.length === 0) {
    return (
      <div className="text-center py-12 bg-muted/50 rounded-xl border border-dashed border-border">
        <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-medium text-foreground">No activity yet</h3>
        <p className="text-muted-foreground text-sm">
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

  // 3. Fetch ALL Reading Activities from user_books (to group by user)
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
    .eq("status", "IS_READING")
    .in("user_id", memberIds)
    .order("synced_at", { ascending: false });

  const profilesMap = new Map(profiles?.map((p) => [p.id, p]) || []);

  // Group activities by user
  const userBooksMap = new Map<string, ReadingActivity[]>();
  readingData?.forEach((item: any) => {
    const activity: ReadingActivity = {
      ...item,
      profile: profilesMap.get(item.user_id),
      updated_at: item.synced_at,
    };
    const existing = userBooksMap.get(item.user_id) || [];
    existing.push(activity);
    userBooksMap.set(item.user_id, existing);
  });

  // Build user list with their books (pass ALL books for client-side expand)
  const usersWithBooks: UserWithBooks[] = Array.from(userBooksMap.entries())
    .map(([user_id, books]) => ({
      user_id,
      profile: profilesMap.get(user_id),
      books, // Pass all books - client component will handle showing more
      totalBooks: books.length,
    }))
    .sort((a, b) => b.totalBooks - a.totalBooks); // Sort by activity

  // Paginate users
  const totalPages = Math.ceil(usersWithBooks.length / USERS_PER_PAGE);
  const from = (currentPage - 1) * USERS_PER_PAGE;
  const to = from + USERS_PER_PAGE;
  const paginatedUsers = usersWithBooks.slice(from, to);

  // Generate pagination page numbers
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("ellipsis");

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);

      if (currentPage < totalPages - 2) pages.push("ellipsis");
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedUsers.length > 0 ? (
          paginatedUsers.map((user) => (
            <UserBooksCard
              key={user.user_id}
              user_id={user.user_id}
              profile={user.profile}
              books={user.books}
              totalBooks={user.totalBooks}
            />
          ))
        ) : (
          <div className="col-span-full text-center py-12 bg-muted/50 rounded-xl border border-dashed border-border">
            <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-medium text-foreground">No activity yet</h3>
            <p className="text-muted-foreground text-sm">
              When members start reading books, they'll appear here.
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href={currentPage > 1 ? `?page=${currentPage - 1}` : "#"}
                aria-disabled={currentPage <= 1}
                className={
                  currentPage <= 1 ? "pointer-events-none opacity-50" : ""
                }
              />
            </PaginationItem>

            {getPageNumbers().map((pageNum, idx) =>
              pageNum === "ellipsis" ? (
                <PaginationItem key={`ellipsis-${idx}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={pageNum}>
                  <PaginationLink
                    href={`?page=${pageNum}`}
                    isActive={pageNum === currentPage}
                  >
                    {pageNum}
                  </PaginationLink>
                </PaginationItem>
              )
            )}

            <PaginationItem>
              <PaginationNext
                href={
                  currentPage < totalPages ? `?page=${currentPage + 1}` : "#"
                }
                aria-disabled={currentPage >= totalPages}
                className={
                  currentPage >= totalPages
                    ? "pointer-events-none opacity-50"
                    : ""
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
