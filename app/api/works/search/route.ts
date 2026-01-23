import { createClient } from "@/lib/supabase/server";
import { fetchFromOpenLibrary } from "@/lib/openlibrary";
import { NextRequest, NextResponse } from "next/server";

interface BookSearchResult {
  bookKey: string; // Book key from Open Library
  title: string;
  authors: { name: string }[];
  cover?: string | null;
  firstPublishYear?: number | null;
  source: "openlibrary";
}

const LIMIT = 10;

// Search works from Open Library API
async function searchWorksInOpenLibrary(
  query: string
): Promise<BookSearchResult[]> {
  try {
    const url = new URL("https://openlibrary.org/search.json");
    url.searchParams.set("q", query);
    url.searchParams.set("limit", LIMIT.toString());
    url.searchParams.set(
      "fields",
      "key,author_name,title,cover_i,first_publish_year,editions"
    );
    url.searchParams.set("mode", "everything");
    url.searchParams.set("_spellcheck_count", "0");

    const response = await fetchFromOpenLibrary(url);

    if (!response.ok) {
      console.error("Open Library API error:", response.status);
      return [];
    }

    const data = await response.json();
    const results: BookSearchResult[] = [];

    for (const doc of data.docs || []) {
      const { author_name, first_publish_year, editions } = doc;

      if (!editions || editions.length === 0) continue;

      const { cover_i, key, title } = editions.docs[0] || {};

      // Extract book key (e.g., "/books/OL7195759M" -> "OL7195759M")
      const bookKey = key?.replace("/books/", "") || null;
      if (!bookKey) continue;

      // Get cover URL
      const cover = cover_i
        ? `https://covers.openlibrary.org/b/id/${cover_i}-M.jpg`
        : null;

      // Get authors
      const authors = (author_name || []).map((name: string) => ({ name }));

      results.push({
        bookKey,
        title,
        authors,
        cover,
        firstPublishYear: first_publish_year || null,
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

  const results = await searchWorksInOpenLibrary(query);

  return NextResponse.json({ results });
}
