"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ReadingStatus = "IS_READING" | "COMPLETED" | "PAUSED" | "ABANDONED";

export interface UpdateUserBookInput {
  bookId: string;
  status?: ReadingStatus;
  progress?: number;
  capacity?: number;
  unit?: string;
}

export interface BookSearchResult {
  id?: string;
  isbn13: string | null;
  isbn10?: string | null;
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
  openLibraryKey?: string | null; // Added for work key
}

// Helper to fetch all editions from Open Library
async function fetchAndInsertEditions(workKey: string, workId: string, supabase: any) {
  try {
    const response = await fetch(
      `https://openlibrary.org/works/${workKey}/editions.json?limit=100` // Limit to prevent massive inserts
    );
    
    if (!response.ok) return;

    const data = await response.json();
    const entries = data.entries || [];

    if (entries.length === 0) return;

    // Map OL editions to our schema
    const editionsToInsert = entries.map((edition: any) => ({
      book_id: workId,
      title: edition.title,
      isbn13: edition.isbn_13?.[0] || null,
      isbn10: edition.isbn_10?.[0] || null,
      publisher: edition.publishers?.[0] || null,
      page_count: edition.number_of_pages || null,
      published_date: edition.publish_date || null,
      cover: edition.covers?.[0] 
        ? `https://covers.openlibrary.org/b/id/${edition.covers[0]}-M.jpg` 
        : null,
      language: edition.languages?.[0]?.key?.replace("/languages/", "") || null,
    }))
    // Filter out entries with no ISBNs to keep our DB clean(er)
    .filter((e: any) => e.isbn13 || e.isbn10);
    
    // Deduplicate by ISBN before insert (OL can be messy)
    const uniqueEditions = new Map();
    editionsToInsert.forEach((e: any) => {
       const key = e.isbn13 || e.isbn10;
       if (key && !uniqueEditions.has(key)) {
         uniqueEditions.set(key, e);
       }
    });
    
    const finalEditions = Array.from(uniqueEditions.values());

    if (finalEditions.length > 0) {
      const { error } = await supabase.from("editions").insert(finalEditions);
      if (error) console.error("Error bulk inserting editions:", error);
    }

  } catch (error) {
    console.error("Error fetching/inserting extra editions:", error);
  }
}

// Add a book to the user's shelf
export async function addBookToShelf(book: BookSearchResult) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // 1. Determine "Work" ID (book_id in our schema)
  let workId: string | null = null;
  let isNewWork = false;
  
  // A. Check by Work Key (if available, e.g., OL123W from Open Library)
  if (book.openLibraryKey) {
     const { data: existingWork } = await supabase
        .from("books")
        .select("id")
        .eq("work_key", book.openLibraryKey)
        .single();
     if (existingWork) workId = existingWork.id;
  }

  // B. If no Work found by key, check by ISBN in EDITIONS table
  if (!workId && (book.isbn13 || book.isbn10)) {
     // We search in editions to find the parent work_id
     let query = supabase.from("editions").select("book_id").limit(1);
     
     if (book.isbn13) query = query.eq("isbn13", book.isbn13);
     else if (book.isbn10) query = query.eq("isbn10", book.isbn10);
     
     const { data: edition } = await query.single();
     if (edition) workId = edition.book_id;
  }

  // 2. If Work doesn't exist, create it
  if (!workId) {
    isNewWork = true;
    const { data: newWork, error: createWorkError } = await supabase
      .from("books")
      .insert({
        work_key: book.openLibraryKey || null, // Can be null for custom books
        title: book.title,
        subtitle: book.subtitle,
        description: book.description,
        authors: JSON.stringify(book.authors),
        subjects: JSON.stringify(book.subjects || []),
        // Populate legacy/cache columns on books table too
        cover: book.cover, 
        published_date: book.published_date,
        publisher: book.publisher,
        page_count: book.page_count,
        isbn13: book.isbn13,
      })
      .select("id")
      .single();

    if (createWorkError) {
      console.error("Error creating work:", createWorkError);
      return { error: createWorkError.message };
    }
    workId = newWork.id;
    
    // If we have an OpenLibrary Key, we can fetch all peers!
    const olKey = book.openLibraryKey;
    if (olKey && workId) {
       // We don't await this to keep UI snappy, or we do? 
       // Vercel serverless might kill it if we don't await. 
       // For safety in this environment, let's await but handle errors gracefully.
       await fetchAndInsertEditions(olKey, workId, supabase);
    }
  }

  // 3. Ensure this specific Edition exists (in case the bulk fetch missed it or it wasn't run)
  // We check if an edition with this ISBN exists for this work
  if (book.isbn13 || book.isbn10) {
     let editionQuery = supabase.from("editions").select("id").eq("book_id", workId);
     if (book.isbn13) editionQuery = editionQuery.eq("isbn13", book.isbn13);
     else if (book.isbn10) editionQuery = editionQuery.eq("isbn10", book.isbn10);
     
     const { data: existingEdition } = await editionQuery.maybeSingle();

     if (!existingEdition) {
        // Create the edition
         await supabase.from("editions").insert({
           book_id: workId,
           title: book.title,
           isbn13: book.isbn13,
           isbn10: book.isbn10,
           publisher: book.publisher,
           page_count: book.page_count,
           published_date: book.published_date,
           cover: book.cover,
           // language? (not in search result currently, can skip)
         });
     }
  }

  // 4. Add to User's Shelf (User tracks the Work)
  const { data: existingUserBook } = await supabase
    .from("user_books")
    .select("id")
    .eq("user_id", user.id)
    .eq("book_id", workId)
    .single();

  if (existingUserBook) {
    return { error: "Book already in your shelf" };
  }

  const { error: addError } = await supabase.from("user_books").insert({
    user_id: user.id,
    book_id: workId,
    status: "IS_READING",
    progress: 0,
  });

  if (addError) {
    console.error("Error adding book to shelf:", addError);
    return { error: addError.message };
  }

  revalidatePath("/dashboard/shelf");
  return { success: true, bookId: workId };
}

export async function updateUserBook(input: UpdateUserBookInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const { bookId, status, progress, capacity, unit } = input;

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (status !== undefined) {
    updateData.status = status;
  }

  if (progress !== undefined) {
    updateData.progress = progress;
  }

  if (capacity !== undefined) {
    updateData.capacity = capacity;
  }

  if (unit !== undefined) {
    updateData.unit = unit;
  }

  // Set completed based on status or progress
  if (status === "COMPLETED") {
    updateData.completed = true;
  } else if (progress !== undefined && capacity !== undefined && capacity > 0) {
    updateData.completed = progress >= capacity;
  }

  const { error } = await supabase
    .from("user_books")
    .update(updateData)
    .eq("user_id", user.id)
    .eq("book_id", bookId);

  if (error) {
    console.error("Error updating user book:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/shelf");
  return { success: true };
}

// Alias for backward compatibility
export const updateBook = updateUserBook;
