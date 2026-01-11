import { createClient } from "@/lib/supabase/server";
import { BookCard } from "@/components/shelf/book-card";

export default async function ShelfPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch user_books - no need to join with books table anymore
  const { data: userBooks } = await supabase
    .from("user_books")
    .select("*")
    .eq("user_id", user?.id);

  // Sort books by progress percentage (high to low)
  const sortedBooks = userBooks?.slice().sort((a, b) => {
    const progressA = a.capacity ? (a.progress / a.capacity) * 100 : 0;
    const progressB = b.capacity ? (b.progress / b.capacity) * 100 : 0;
    return progressB - progressA;
  });

  return (
    <div>
      <div className="flex flex-col divide-y divide-border">
        {sortedBooks &&
          sortedBooks.length > 0 &&
          sortedBooks.map((userBook) => (
            <div key={userBook.id} className="py-3 first:pt-0 last:pb-0">
              <BookCard userBook={userBook} />
            </div>
          ))}
      </div>
      {(!userBooks || userBooks.length === 0) && (
        <div className="text-center py-12 text-muted-foreground">
          <p>
            No books in your shelf yet. Use the search in the header to add
            books!
          </p>
        </div>
      )}
    </div>
  );
}
