"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ReadingStatus =
  | "WANT_TO_READ"
  | "IS_READING"
  | "COMPLETED"
  | "PAUSED"
  | "ABANDONED";

export interface UpdateUserBookInput {
  id: string; // user_books id
  status?: ReadingStatus;
  progress?: number;
  capacity?: number;
  unit?: string;
}

export interface BookSearchResult {
  // Book identifier (Open Library key - can be work or edition)
  bookKey?: string | null; // e.g., OL123W (work) or OL123M (edition)

  // Source-agnostic identifiers
  isbn13?: string | null; // ISBN-13 for portable identification across data sources
  isbn10?: string | null; // ISBN-10 for books that only have ISBN-10

  // Book metadata
  title: string;
  cover?: string | null;

  // Authors
  authors: { name: string }[];

  // Publication details
  published_date?: string | null;
  page_count?: number | null;
  language?: string | null;
}

// Add a book to the user's shelf
export async function addBookToShelf(
  book: BookSearchResult,
  status: ReadingStatus = "WANT_TO_READ"
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Check if user already has this book by book_key, isbn13, or isbn10
  let existingUserBook = null;

  // First check by book_key (Open Library key)
  if (book.bookKey) {
    const { data } = await supabase
      .from("user_books")
      .select("id")
      .eq("user_id", user.id)
      .eq("book_key", book.bookKey)
      .maybeSingle();
    existingUserBook = data;
  }

  // If not found by book_key, check by isbn13
  if (!existingUserBook && book.isbn13) {
    const { data } = await supabase
      .from("user_books")
      .select("id")
      .eq("user_id", user.id)
      .eq("isbn13", book.isbn13)
      .maybeSingle();
    existingUserBook = data;
  }

  // If still not found, check by isbn10
  if (!existingUserBook && book.isbn10) {
    const { data } = await supabase
      .from("user_books")
      .select("id")
      .eq("user_id", user.id)
      .eq("isbn10", book.isbn10)
      .maybeSingle();
    existingUserBook = data;
  }

  if (existingUserBook) {
    return { error: "Book already in your shelf" };
  }

  // Insert the book directly into user_books with all book information
  const { data: newUserBook, error: addError } = await supabase
    .from("user_books")
    .insert({
      user_id: user.id,
      book_key: book.bookKey,
      isbn13: book.isbn13,
      isbn10: book.isbn10,
      title: book.title,
      cover: book.cover,
      authors: JSON.stringify(book.authors),
      published_date: book.published_date,
      page_count: book.page_count,
      capacity: book.page_count,
      unit: "pages",
      language: book.language,
      status: status,
      progress: 0,
    })
    .select("id")
    .single();

  if (addError) {
    console.error("Error adding book to shelf:", addError);
    return { error: addError.message };
  }

  revalidatePath("/dashboard/shelf");
  return { success: true, userBookId: newUserBook.id };
}

export async function updateUserBook(input: UpdateUserBookInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const { id, status, progress, capacity, unit } = input;

  // Fetch current state to calculate progress delta
  const { data: currentBook } = await supabase
    .from("user_books")
    .select("progress, capacity, status")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

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
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error updating user book:", error);
    return { error: error.message };
  }

  // Log progress history for statistics tracking
  const newProgress = progress ?? currentBook?.progress ?? 0;
  const newCapacity = capacity ?? currentBook?.capacity;
  const newStatus = status ?? currentBook?.status ?? "WANT_TO_READ";
  const previousProgress = currentBook?.progress ?? 0;
  const pagesRead = Math.max(0, newProgress - previousProgress);

  // Only log if there's actual progress change or status change
  if (pagesRead > 0 || status !== undefined) {
    await supabase.from("reading_progress_history").insert({
      user_id: user.id,
      user_book_id: id,
      progress: newProgress,
      capacity: newCapacity,
      status: newStatus,
      pages_read: pagesRead,
    });
  }

  revalidatePath("/dashboard/shelf");
  revalidatePath("/dashboard/statistics");
  return { success: true };
}

// Update only the status of a book by book_key
export async function updateBookStatus(bookKey: string, status: ReadingStatus) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("user_books")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("book_key", bookKey);

  if (error) {
    console.error("Error updating book status:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/shelf");
  revalidatePath("/dashboard/book/[id]");
  return { success: true };
}

// Remove a book from the user's shelf by user_books ID
export async function removeBookFromShelf(userBookId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("user_books")
    .delete()
    .eq("id", userBookId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error removing book from shelf:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/shelf");
  revalidatePath("/dashboard/book/[id]");
  return { success: true };
}

// Remove a book from the user's shelf by book_key
export async function removeBookByKey(bookKey: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("user_books")
    .delete()
    .eq("book_key", bookKey)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error removing book from shelf:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/shelf");
  revalidatePath("/dashboard/book/[id]");
  return { success: true };
}

// Alias for backward compatibility
export const updateBook = updateUserBook;
