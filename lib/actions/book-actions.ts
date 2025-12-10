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
    synced_at: new Date().toISOString(),
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
