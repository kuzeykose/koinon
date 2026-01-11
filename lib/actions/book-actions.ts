"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ReadingStatus = "IS_READING" | "COMPLETED" | "PAUSED" | "ABANDONED";

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
export async function addBookToShelf(book: BookSearchResult) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Check if user already has this book by book_key
  let existingUserBook = null;

  if (book.bookKey) {
    const { data } = await supabase
      .from("user_books")
      .select("id")
      .eq("user_id", user.id)
      .eq("book_key", book.bookKey)
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
      title: book.title,
      cover: book.cover,
      authors: JSON.stringify(book.authors),
      published_date: book.published_date,
      page_count: book.page_count,
      capacity: book.page_count,
      unit: "pages",
      language: book.language,
      status: "IS_READING",
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

  revalidatePath("/dashboard/shelf");
  return { success: true };
}

// Alias for backward compatibility
export const updateBook = updateUserBook;
