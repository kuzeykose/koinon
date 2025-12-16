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
  source: "database" | "openlibrary";
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

  let bookId = book.id;

  // If the book is from Open Library, we need to save it to our database first
  if (book.source === "openlibrary" || !bookId) {
    // Check if book already exists by ISBN13
    if (book.isbn13) {
      const { data: existingBook } = await supabase
        .from("books")
        .select("id")
        .eq("isbn13", book.isbn13)
        .single();

      if (existingBook) {
        bookId = existingBook.id;
      }
    }

    // If book doesn't exist, create it
    if (!bookId) {
      const { data: newBook, error: createError } = await supabase
        .from("books")
        .insert({
          isbn13: book.isbn13,
          isbn10: book.isbn10,
          title: book.title,
          subtitle: book.subtitle,
          authors: JSON.stringify(book.authors),
          cover: book.cover,
          published_date: book.published_date,
          publisher: book.publisher,
          page_count: book.page_count,
          description: book.description,
        })
        .select("id")
        .single();

      if (createError) {
        console.error("Error creating book:", createError);
        return { error: createError.message };
      }

      bookId = newBook.id;
    }
  }

  // Check if user already has this book
  const { data: existingUserBook } = await supabase
    .from("user_books")
    .select("id")
    .eq("user_id", user.id)
    .eq("book_id", bookId)
    .single();

  if (existingUserBook) {
    return { error: "Book already in your shelf" };
  }

  // Add book to user's shelf
  const { error: addError } = await supabase.from("user_books").insert({
    user_id: user.id,
    book_id: bookId,
    status: "IS_READING",
    progress: 0,
  });

  if (addError) {
    console.error("Error adding book to shelf:", addError);
    return { error: addError.message };
  }

  revalidatePath("/dashboard/shelf");
  return { success: true, bookId };
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
