import { createClient } from "@/lib/supabase/server";
import { fetchFromOpenLibrary } from "@/lib/openlibrary";
import { NextRequest, NextResponse } from "next/server";

export interface WorkDetails {
  id?: string;
  workKey: string; // Open Library work key
  title: string;
  subtitle?: string | null;
  authors: { name: string }[];
  cover?: string | null;
  description?: string | null;
  subjects?: string[];
  firstPublishYear?: number | null;
  source: "openlibrary";
}

// Fetch work from Open Library by work key
async function getWorkFromOpenLibrary(
  workKey: string
): Promise<WorkDetails | null> {
  try {
    // Fetch work details
    const workResponse = await fetchFromOpenLibrary(
      `https://openlibrary.org/works/${workKey}.json`
    );

    if (!workResponse.ok) {
      return null;
    }

    const work = await workResponse.json();

    // Get authors in parallel
    const authorPromises = (work.authors || []).map(async (authorRef: any) => {
      const authorKey = authorRef.author?.key;
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

    // Get cover from work
    const coverId = work.covers?.[0];
    const cover = coverId
      ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`
      : null;

    // Get subjects
    const subjects = work.subjects?.slice(0, 10) || [];

    const description = work.description?.value || work.description || null;

    return {
      workKey,
      title: work.title,
      subtitle: work.subtitle || null,
      authors,
      cover,
      description,
      subjects,
      firstPublishYear: work.first_publish_year || null,
      source: "openlibrary" as const,
    };
  } catch (error) {
    console.error("Open Library work fetch error:", error);
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
    return NextResponse.json({ error: "Work key required" }, { status: 400 });
  }

  // Validate work key format
  if (!id.startsWith("OL") || !id.includes("W")) {
    return NextResponse.json(
      { error: "Invalid Open Library work key" },
      { status: 400 }
    );
  }

  const work = await getWorkFromOpenLibrary(id);
  if (work) {
    // Check if user has this book in their shelf
    const { data: existingUserBook } = await supabase
      .from("user_books")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("book_key", id)
      .maybeSingle();

    return NextResponse.json({
      work,
      inUserShelf: !!existingUserBook,
      userBookStatus: existingUserBook?.status || null,
    });
  }

  return NextResponse.json({ error: "Work not found" }, { status: 404 });
}
