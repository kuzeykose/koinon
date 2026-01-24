"use server";

import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_WEEK_START_DAY,
  type WeekStartDay,
} from "@/lib/constants";
import type { ReadingStats } from "./stats/types";
import { calculateStats } from "./stats/stats-calculations";

export async function getReadingStats(
  targetUserId?: string,
  timezone?: string
): Promise<{ data: ReadingStats | null; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: "Unauthorized" };
  }

  const userId = targetUserId || user.id;
  const isOwnStats = userId === user.id;

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_stats_public, week_start_day")
    .eq("id", userId)
    .single();

  if (!isOwnStats) {
    if (!profile?.is_stats_public) {
      return { data: null, error: "Statistics are private" };
    }
  }

  const weekStartDay =
    (profile?.week_start_day as WeekStartDay) || DEFAULT_WEEK_START_DAY;

  const { data: history, error: historyError } = await supabase
    .from("reading_progress_history")
    .select("*, user_books!inner(id, title)")
    .eq("user_id", userId)
    .order("recorded_at", { ascending: true });

  if (historyError) {
    console.error("Error fetching progress history:", historyError);
    return { data: null, error: historyError.message };
  }

  const { data: completedBooks, error: booksError } = await supabase
    .from("user_books")
    .select("id, title, cover, updated_at")
    .eq("user_id", userId)
    .eq("status", "COMPLETED")
    .order("updated_at", { ascending: false });

  if (booksError) {
    console.error("Error fetching completed books:", booksError);
    return { data: null, error: booksError.message };
  }

  const stats = calculateStats(
    history || [],
    completedBooks || [],
    timezone,
    weekStartDay
  );

  return { data: stats, error: null };
}