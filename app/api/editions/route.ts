import { createClient } from "@/lib/supabase/server";
import { fetchFromOpenLibrary } from "@/lib/openlibrary";
import { NextRequest, NextResponse } from "next/server";

export interface BookEdition {
  key: string;
  title: string;
  isbn13?: string | null;
  isbn10?: string | null;
  cover?: string | null;
  publisher?: string | null;
  publish_date?: string | null;
  page_count?: number | null;
  format?: string | null;
  language?: string | null;
}

export interface EditionsResponse {
  editions: BookEdition[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  source: "openlibrary";
}

// Fetch editions from Open Library with pagination
async function getEditionsFromOpenLibrary(
  workKey: string,
  page: number,
  limit: number
): Promise<EditionsResponse | null> {
  try {
    console.log(
      `Fetching editions for work: ${workKey}, page: ${page}, limit: ${limit}`
    );

    // Fetch work details to get title
    const workResponse = await fetchFromOpenLibrary(
      `https://openlibrary.org/works/${workKey}.json`
    );

    if (!workResponse.ok) {
      console.error(`Work fetch failed: ${workResponse.status}`);
      return null;
    }

    const work = await workResponse.json();

    // Fetch editions with offset (Open Library supports offset and limit)
    const offset = (page - 1) * limit;
    const editionsUrl = `https://openlibrary.org/works/${workKey}/editions.json?offset=${offset}&limit=${limit}`;
    console.log(`Fetching editions from: ${editionsUrl}`);

    const editionsResponse = await fetchFromOpenLibrary(editionsUrl);

    if (!editionsResponse.ok) {
      console.error(`Editions fetch failed: ${editionsResponse.status}`);
      return null;
    }

    const editionsData = await editionsResponse.json();
    console.log(
      `Open Library returned ${
        editionsData.entries?.length || 0
      } editions, total size: ${editionsData.size || 0}`
    );
    const rawEditions = editionsData.entries || [];
    const size = editionsData.size || 0; // Total count from Open Library

    // Map to our format with metadata for sorting
    const mappedEditions = rawEditions.map((edition: any) => {
      const editionKey = edition.key?.replace("/books/", "") || null;
      const editionCoverId = edition.covers?.[0];

      return {
        key: editionKey,
        title: edition.title || work.title,
        isbn13: edition.isbn_13?.[0] || null,
        isbn10: edition.isbn_10?.[0] || null,
        cover: editionCoverId
          ? `https://covers.openlibrary.org/b/id/${editionCoverId}-M.jpg`
          : null,
        publisher: edition.publishers?.[0] || null,
        publish_date: edition.publish_date || null,
        page_count: edition.number_of_pages || null,
        format: edition.physical_format || null,
        language:
          edition.languages?.[0]?.key?.replace("/languages/", "") || null,
        // Internal props for sorting
        _hasCover: !!editionCoverId,
        _publishYear: edition.publish_date
          ? parseInt(edition.publish_date.match(/\d{4}/)?.[0] || "0")
          : 0,
      };
    });

    // Remove duplicates by ISBN (prefer editions with covers)
    const seenISBNs = new Set<string>();
    const uniqueEditions = mappedEditions.filter((ed: any) => {
      const isbn = ed.isbn13 || ed.isbn10;
      if (!isbn) return true; // Keep editions without ISBN
      if (seenISBNs.has(isbn)) return false;
      seenISBNs.add(isbn);
      return true;
    });

    // Sort by: has cover > newer publication > title
    const sortedEditions = uniqueEditions.sort((a: any, b: any) => {
      // Prioritize editions with covers
      if (a._hasCover !== b._hasCover) return b._hasCover ? 1 : -1;
      // Then by publication year (newer first)
      if (a._publishYear !== b._publishYear)
        return b._publishYear - a._publishYear;
      // Finally by title
      return a.title.localeCompare(b.title);
    });

    // Remove internal properties
    const editions: BookEdition[] = sortedEditions.map((ed: any) => {
      const { _hasCover, _publishYear, ...cleanEdition } = ed;
      return cleanEdition;
    });

    const totalPages = Math.ceil(size / limit);

    return {
      editions,
      pagination: {
        page,
        limit,
        total: size,
        totalPages,
        hasMore: page < totalPages,
      },
      source: "openlibrary",
    };
  } catch (error) {
    console.error("Open Library editions fetch error:", error);
    return null;
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
  const workKey = searchParams.get("workKey"); // Open Library work key
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100); // Max 100 per page

  if (!workKey) {
    return NextResponse.json(
      { error: "Work key required (use ?workKey=...)" },
      { status: 400 }
    );
  }

  if (!workKey.startsWith("OL") || !workKey.includes("W")) {
    return NextResponse.json(
      { error: "Invalid Open Library work key" },
      { status: 400 }
    );
  }

  if (page < 1 || limit < 1) {
    return NextResponse.json(
      { error: "Invalid pagination parameters" },
      { status: 400 }
    );
  }

  const result = await getEditionsFromOpenLibrary(workKey, page, limit);
  if (result) {
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: "Editions not found" }, { status: 404 });
}
