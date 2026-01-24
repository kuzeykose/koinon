"use server";

import { createClient } from "@/lib/supabase/server";
import type { ChartData, TimeRange } from "./types";
import { getDailyActivityByBook } from "./stats-calculations";

export async function getChartData(
  timeRange: TimeRange = "30d",
  targetUserId?: string,
  timezone?: string
): Promise<{ data: ChartData | null; error: string | null }> {
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

  const daysMap: Record<TimeRange, number> = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
  };

  const days = daysMap[timeRange];

  const { data: history, error: historyError } = await supabase
    .from("reading_progress_history")
    .select("*, user_books!inner(id, title)")
    .eq("user_id", userId)
    .order("recorded_at", { ascending: true });

  if (historyError) {
    console.error("Error fetching progress history:", historyError);
    return { data: null, error: historyError.message };
  }

  const { dailyActivityByBook, bookMetadata } = getDailyActivityByBook(
    history || [],
    days,
    timezone
  );

  const bookIds = Object.keys(bookMetadata);
  const totalPages = dailyActivityByBook.reduce((sum, day) => {
    return (
      sum +
      bookIds.reduce((daySum, bookId) => {
        return daySum + (Number(day[bookId]) || 0);
      }, 0)
    );
  }, 0);

  const daysWithReading = dailyActivityByBook.filter((day) => {
    return bookIds.some((bookId) => (Number(day[bookId]) || 0) > 0);
  }).length;

  const avgPages =
    daysWithReading > 0 ? Math.round(totalPages / daysWithReading) : 0;

  return {
    data: {
      dailyActivityByBook,
      bookMetadata,
      totalPages,
      daysWithReading,
      avgPages,
    },
    error: null,
  };
}
