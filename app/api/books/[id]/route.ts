import { createClient } from "@/lib/supabase/server";
import { fetchFromOpenLibrary } from "@/lib/openlibrary";
import { NextRequest, NextResponse } from "next/server";

export interface BookEditionDetails {
  id?: string;
  isbn13: string | null;
  isbn10?: string | null;
  openLibraryKey: string; // Edition key (e.g., OL123M)
  workKey: string | null; // Work key for fetching other editions
  title: string;
  subtitle?: string | null;
  authors: { name: string }[];
  cover?: string | null;
  publishDate?: string | null;
  publisher?: string | null;
  pageCount?: number | null;
  description?: string | null;
  subjects?: string[];
  format?: string | null;
  language?: string | null;
  source: "database" | "openlibrary";
  // User's relationship with the book (if in their shelf)
  userBook?: {
    status: string;
    progress: number;
    capacity?: number;
    unit?: string;
  } | null;
}

// Fetch specific book edition from Open Library by edition key
async function getBookEditionFromOpenLibrary(
  bookKey: string
): Promise<BookEditionDetails | null> {
  try {
    // Fetch edition details
    const bookResponse = await fetchFromOpenLibrary(
      `https://openlibrary.org/books/${bookKey}.json`
    );

    if (!bookResponse.ok) {
      return null;
    }

    const book = await bookResponse.json();

    // Get work key and fetch work details for description and subjects
    const workKey = book.works?.[0]?.key?.replace("/works/", "") || null;
    let work = null;
    if (workKey) {
      const workResponse = await fetchFromOpenLibrary(
        `https://openlibrary.org/works/${workKey}.json`
      );
      if (workResponse.ok) {
        work = await workResponse.json();
      }
    }

    // Get authors in parallel (prefer edition authors, fallback to work authors)
    const authorRefs = book.authors || work?.authors || [];
    const authorPromises = authorRefs.map(async (authorRef: any) => {
      const authorKey = authorRef.author?.key || authorRef.key;
      if (!authorKey) return null;

      try {
        const authorResponse = await fetchFromOpenLibrary(
          `https://openlibrary.org${authorKey}.json`
        );
        if (authorResponse.ok) {
          const authorData = await authorResponse.json();
          return { name: authorData.name || "Unknown Author" };
        }
      } catch {
        // Skip failed author fetches
      }
      return null;
    });

    const authors = (await Promise.all(authorPromises)).filter(
      (author): author is { name: string } => author !== null
    );

    // Get cover
    const coverId = book.covers?.[0];
    const cover = coverId
      ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`
      : null;

    // Get subjects from work
    const subjects = work?.subjects?.slice(0, 10) || [];

    // Get description (prefer edition, fallback to work)
    const description =
      book.description?.value ||
      book.description ||
      work?.description?.value ||
      work?.description ||
      null;

    return {
      isbn13: book.isbn_13?.[0] || null,
      isbn10: book.isbn_10?.[0] || null,
      openLibraryKey: bookKey,
      workKey: workKey,
      title: book.title || work?.title,
      subtitle: book.subtitle || null,
      authors,
      cover,
      publishDate: book.publish_date || null,
      publisher: book.publishers?.[0] || null,
      pageCount: book.number_of_pages || null,
      description,
      subjects,
      format: book.physical_format || null,
      language: book.languages?.[0]?.key?.replace("/languages/", "") || null,
      source: "openlibrary" as const,
    };
  } catch (error) {
    console.error("Open Library edition fetch error:", error);
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { error: "Book edition key required" },
      { status: 400 }
    );
  }

  // Validate edition key format (e.g., OL123M)
  if (!id.startsWith("OL") || !id.includes("M")) {
    return NextResponse.json(
      { error: "Invalid Open Library edition key" },
      { status: 400 }
    );
  }

  const bookEdition = await getBookEditionFromOpenLibrary(id);
  if (bookEdition) {
    // Check if user has this book in their shelf
    const { data: existingUserBook } = await supabase
      .from("user_books")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("book_key", id)
      .maybeSingle();

    return NextResponse.json({
      book: bookEdition,
      inUserShelf: !!existingUserBook,
      userBookStatus: existingUserBook?.status || null,
    });
  }

  return NextResponse.json(
    { error: "Book edition not found" },
    { status: 404 }
  );
}
