import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

interface BookSearchResult {
  id?: string;
  isbn13: string | null;
  isbn10?: string | null;
  openLibraryKey?: string | null;
  title: string;
  subtitle?: string | null;
  authors: { name: string }[];
  cover?: string | null;
  published_date?: string | null;
  publisher?: string | null;
  page_count?: number | null;
  description?: string | null;
  subjects?: string[];
  source: "database" | "openlibrary";
}

const LIMIT = 5;

// Search books in our database
async function searchBooksInDatabase(
  query: string,
  limit: number
): Promise<BookSearchResult[]> {
  const supabase = await createClient();

  const { data: books, error } = await supabase
    .from("books")
    .select("*")
    .ilike("title", `%${query}%`)
    .limit(limit);

  if (error || !books) {
    console.error("Database search error:", error);
    return [];
  }

  return books.map((book) => {
    // Safely parse subjects
    let subjects: string[] = [];
    if (Array.isArray(book.subjects)) {
      subjects = book.subjects;
    } else if (typeof book.subjects === "string") {
      try {
        subjects = JSON.parse(book.subjects);
      } catch {
        subjects = [];
      }
    }

    return {
      id: book.id,
      isbn13: book.isbn13,
      isbn10: book.isbn10,
      title: book.title,
      subtitle: book.subtitle,
      authors: book.authors ? JSON.parse(book.authors) : [],
      cover: book.cover,
      published_date: book.published_date,
      publisher: book.publisher,
      page_count: book.page_count,
      description: book.description,
      subjects,
      source: "database" as const,
    };
  });
}

// Search books from Open Library API
async function searchBooksInOpenLibrary(
  query: string,
  limit: number,
  excludeIsbns: Set<string>
): Promise<BookSearchResult[]> {
  try {
    const response = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(
        query
      )}&limit=${limit + excludeIsbns.size + 10}`
    );

    if (!response.ok) {
      console.error("Open Library API error:", response.status);
      return [];
    }

    const data = await response.json();
    const results: BookSearchResult[] = [];

    for (const doc of data.docs || []) {
      if (results.length >= limit) break;

      // Get ISBN13 from the book
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const isbn13 =
        doc.isbn?.find((isbn: string) => isbn.length === 13) || null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const isbn10 =
        doc.isbn?.find((isbn: string) => isbn.length === 10) || null;

      // Skip if we already have this book (by ISBN13)
      if (isbn13 && excludeIsbns.has(isbn13)) {
        continue;
      }
      
      // Also check ISBN10 if we haven't matched by ISBN13
      if (isbn10 && excludeIsbns.has(isbn10)) {
        continue;
      }

      // Get cover URL
      const coverId = doc.cover_i;
      const cover = coverId
        ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`
        : null;

      // Get authors
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const authors = (doc.author_name || []).map((name: string) => ({ name }));

      // Get subjects (limit to 5)
      const subjects = (doc.subject || []).slice(0, 5);

      // Extract work key (e.g., "/works/OL45883W" -> "OL45883W")
      const openLibraryKey = doc.key?.replace("/works/", "") || null;

      results.push({
        isbn13,
        isbn10,
        openLibraryKey,
        title: doc.title,
        subtitle: doc.subtitle || null,
        authors,
        cover,
        published_date: doc.first_publish_year?.toString() || null,
        publisher: doc.publisher?.[0] || null,
        page_count: doc.number_of_pages_median || null,
        description: null,
        subjects,
        source: "openlibrary" as const,
      });
    }

    return results;
  } catch (error) {
    console.error("Open Library fetch error:", error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");

  if (!query || query.trim().length < 2) {
    return NextResponse.json({ results: [] });
  }

  // First, search in our database
  const dbResults = await searchBooksInDatabase(query, LIMIT);

  // Collect ISBNs we already have to avoid duplicates from Open Library
  const existingIsbns = new Set<string>();
  for (const book of dbResults) {
    if (book.isbn13) existingIsbns.add(book.isbn13);
    if (book.isbn10) existingIsbns.add(book.isbn10);
  }

  // If we have enough results from database, return them
  if (dbResults.length >= LIMIT) {
    return NextResponse.json({ results: dbResults.slice(0, LIMIT) });
  }

  // Otherwise, fetch remaining from Open Library
  const remainingSlots = LIMIT - dbResults.length;
  const openLibraryResults = await searchBooksInOpenLibrary(
    query,
    remainingSlots,
    existingIsbns
  );

  // Combine results, database first
  const results = [...dbResults, ...openLibraryResults].slice(0, LIMIT);

  return NextResponse.json({ results });
}
