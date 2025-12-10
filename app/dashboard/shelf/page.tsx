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

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {books &&
          books.length > 0 &&
          books.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              userBook={getUserBook(book.id)}
            />
          ))}
      </div>
      {(!books || books.length === 0) && (
        <div className="text-center py-12 text-zinc-500">
          <p>No books in your shelf yet.</p>
        </div>
      )}
    </div>
  );
}
