import { createClient } from "@/lib/supabase/server";
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

export interface BookDetails {
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
  editions?: BookEdition[];
  source: "database" | "openlibrary";
  // User's relationship with the book (if in their shelf)
  userBook?: {
    status: string;
    progress: number;
    capacity?: number;
    unit?: string;
  } | null;
}

// Fetch book from our database by ID, ISBN13, or Open Library key
async function getBookFromDatabase(
  identifier: string
): Promise<BookDetails | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Try to find by ID first (UUID format)
  let book = null;
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (uuidRegex.test(identifier)) {
    const { data } = await supabase
      .from("books")
      .select("*")
      .eq("id", identifier)
      .single();
    book = data;
  }

  // Try by ISBN13
  if (!book) {
    const { data } = await supabase
      .from("books")
      .select("*")
      .eq("isbn13", identifier)
      .single();
    book = data;
  }

  if (!book) {
    return null;
  }

  // Check if user has this book in their shelf
  let userBook = null;
  if (user) {
    const { data } = await supabase
      .from("user_books")
      .select("status, progress, capacity, unit")
      .eq("user_id", user.id)
      .eq("book_id", book.id)
      .single();
    userBook = data;
  }

  // Fetch editions using the book_id
  const { data: editionsData } = await supabase
    .from("editions")
    .select("*")
    .eq("book_id", book.id);

  const editions: BookEdition[] = (editionsData || []).map((e: any) => ({
    key: e.id, // Use our DB ID as key
    title: e.title || book.title, // Fallback to book title
    isbn13: e.isbn13,
    isbn10: e.isbn10,
    cover: e.cover,
    publisher: e.publisher,
    publish_date: e.published_date, // Note: DB column is published_date, interface is publish_date
    page_count: e.page_count,
    language: e.language,
  }));

  // Safely parse authors and subjects
  let authors = [];
  if (Array.isArray(book.authors)) {
    authors = book.authors;
  } else if (typeof book.authors === "string") {
    try {
      authors = JSON.parse(book.authors);
    } catch (e) {
      authors = [];
    }
  }

  let subjects = [];
  if (Array.isArray(book.subjects)) {
    subjects = book.subjects;
  } else if (typeof book.subjects === "string") {
    try {
      subjects = JSON.parse(book.subjects);
    } catch (e) {
      subjects = [];
    }
  }

  return {
    id: book.id,
    isbn13: book.isbn13,
    isbn10: book.isbn10,
    title: book.title,
    subtitle: book.subtitle,
    authors: authors,
    cover: book.cover,
    published_date: book.published_date,
    publisher: book.publisher,
    page_count: book.page_count,
    description: book.description,
    subjects: subjects,
    editions: editions,
    source: "database" as const,
    userBook,
  };
}

// Helper to check if title is valid for the work
function isValidEditionTitle(workTitle: string, editionTitle: string): boolean {
  const normalize = (s: string) => s.toLowerCase().replace(/[^\w\s]/g, "");
  const w = normalize(workTitle);
  const e = normalize(editionTitle);

  // Exact match (normalized)
  if (w === e) return true;

  // If edition title is significantly shorter than work title, it's suspicious
  // (e.g. Work: "Harry Potter and the Order of the Phoenix", Edition: "Harry Potter")
  if (e.length < w.length * 0.5 && w.includes(e)) {
    return false;
  }
  
  // If work title contains edition title (and length is decent), or vice versa.
  if (w.includes(e) || e.includes(w)) {
     return true;
  }

  return false;
}

// Fetch book from Open Library by work key
async function getBookFromOpenLibrary(
  workKey: string
): Promise<BookDetails | null> {
  try {
    // Fetch work details
    const workResponse = await fetch(
      `https://openlibrary.org/works/${workKey}.json`
    );

    if (!workResponse.ok) {
      return null;
    }

    const work = await workResponse.json();

    // Get description
    let description = null;
    if (typeof work.description === "string") {
      description = work.description;
    } else if (work.description?.value) {
      description = work.description.value;
    }

    // Get authors
    const authors: { name: string }[] = [];
    if (work.authors) {
      for (const authorRef of work.authors) {
        const authorKey = authorRef.author?.key;
        if (authorKey) {
          try {
            const authorResponse = await fetch(
              `https://openlibrary.org${authorKey}.json`
            );
            if (authorResponse.ok) {
              const authorData = await authorResponse.json();
              authors.push({ name: authorData.name || "Unknown Author" });
            }
          } catch {
            // Skip failed author fetches
          }
        }
      }
    }

    // Get cover
    const coverId = work.covers?.[0];
    const cover = coverId
      ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`
      : null;

    // Get subjects
    const subjects = work.subjects?.slice(0, 10) || [];

    // Try to get edition details (for ISBN, page count, etc.)
    let isbn13 = null;
    let isbn10 = null;
    let pageCount = null;
    let publisher = null;
    let publishedDate = null;
    let editions: BookEdition[] = [];

    try {
      // Limit fetch to get enough candidates for filtering
      const editionsResponse = await fetch(
        `https://openlibrary.org/works/${workKey}/editions.json?limit=100`
      );
      if (editionsResponse.ok) {
        const editionsData = await editionsResponse.json();
        const rawEditions = editionsData.entries || [];

        // 1. Map to our format
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
            // Internal props for sorting/dedup
            _hasCover: !!editionCoverId,
            _publishYear: edition.publish_date ? parseInt(edition.publish_date.match(/\d{4}/)?.[0] || "0") : 0
          };
        });

        // 2. Filter bad titles
        const filteredEditions = mappedEditions.filter((e: any) => 
          isValidEditionTitle(work.title, e.title)
        );

        // 3. Deduplicate (group by normalized title + publisher + year)
        const uniqueEditionsMap = new Map();
        
        for (const edition of filteredEditions) {
           const normTitle = edition.title.toLowerCase().trim();
           const normPub = (edition.publisher || "").toLowerCase().trim();
           const year = edition._publishYear;
           
           const key = `${normTitle}|${normPub}|${year}`;

           if (!uniqueEditionsMap.has(key)) {
             uniqueEditionsMap.set(key, edition);
           } else {
             // Keep the better one (prefer cover, then isbn)
             const existing = uniqueEditionsMap.get(key);
             if (!existing._hasCover && edition._hasCover) {
                uniqueEditionsMap.set(key, edition);
             } else if (!existing.isbn13 && edition.isbn13) {
                uniqueEditionsMap.set(key, edition);
             }
           }
        }

        editions = Array.from(uniqueEditionsMap.values());

        // 4. Sort
        editions.sort((a: any, b: any) => {
          // Cover first
          if (a._hasCover !== b._hasCover) {
            return b._hasCover ? 1 : -1;
          }
          // Then newest year
          return b._publishYear - a._publishYear;
        });

        // Clean up internal props
        editions = editions.map((e: any) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { _hasCover, _publishYear, ...rest } = e;
          return rest;
        });

        // Use best edition for main book details if available
        const bestEdition = editions[0];
        if (bestEdition) {
          isbn13 = bestEdition.isbn13 || null;
          isbn10 = bestEdition.isbn10 || null;
          pageCount = bestEdition.page_count || null;
          publisher = bestEdition.publisher || null;
          publishedDate = bestEdition.publish_date || null;
        }
      }
    } catch {
      // Continue without edition details
    }

    // Use first_publish_date from work if available
    if (!publishedDate && work.first_publish_date) {
      publishedDate = work.first_publish_date;
    }

    return {
      isbn13,
      isbn10,
      openLibraryKey: workKey,
      title: work.title,
      subtitle: work.subtitle || null,
      authors,
      cover,
      published_date: publishedDate,
      publisher,
      page_count: pageCount,
      description,
      subjects,
      editions,
      source: "openlibrary" as const,
      userBook: null,
    };
  } catch (error) {
    console.error("Open Library fetch error:", error);
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
      { error: "Book identifier required" },
      { status: 400 }
    );
  }

  // First, try to find in our database
  const dbBook = await getBookFromDatabase(id);
  if (dbBook) {
    return NextResponse.json({ book: dbBook });
  }

  // If not in database and looks like an Open Library key, fetch from there
  if (id.startsWith("OL") && id.endsWith("W")) {
    const olBook = await getBookFromOpenLibrary(id);
    if (olBook) {
      return NextResponse.json({ book: olBook });
    }
  }

  return NextResponse.json({ error: "Book not found" }, { status: 404 });
}
