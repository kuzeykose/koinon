import { createClient } from "@/lib/supabase/server";
import { BookCard } from "@/components/shelf/book-card";

export default async function ShelfPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch user_books with joined book data
  const { data: userBooks } = await supabase
    .from("user_books")
    .select("*")
    .eq("user_id", user?.id);

  const { data: books } = await supabase
    .from("books")
    .select("*")
    .in("id", userBooks?.map((ub) => ub.book_id) || []);

  const getUserBook = (bookId: string) => {
    return userBooks?.find((ub) => ub.book_id === bookId);
  };

  // Sort books by progress percentage (high to low)
  const sortedBooks = books?.slice().sort((a, b) => {
    const userBookA = getUserBook(a.id);
    const userBookB = getUserBook(b.id);
    const progressA = userBookA?.capacity
      ? (userBookA.progress / userBookA.capacity) * 100
      : 0;
    const progressB = userBookB?.capacity
      ? (userBookB.progress / userBookB.capacity) * 100
      : 0;
    return progressB - progressA;
  });

  return (
    <div>
      <div className="flex flex-col divide-y divide-border">
        {sortedBooks &&
          sortedBooks.length > 0 &&
          sortedBooks.map((book) => (
            <div key={book.id} className="py-3 first:pt-0 last:pb-0">
              <BookCard book={book} userBook={getUserBook(book.id)} />
            </div>
          ))}
      </div>
      {(!books || books.length === 0) && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No books in your shelf yet.</p>
        </div>
      )}
    </div>
  );
}
