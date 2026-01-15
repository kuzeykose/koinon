"use server";

import { createClient } from "@/lib/supabase/server";

export interface ReadingStats {
  totalPagesRead: number;
  totalBooksCompleted: number;
  currentStreak: number;
  longestStreak: number;
  pagesThisWeek: number;
  pagesThisMonth: number;
  dailyActivity: { date: string; pages: number }[];
  completedBooks: {
    id: string;
    title: string;
    cover?: string | null;
    completedAt: string;
  }[];
  readingDays: string[]; // Array of dates with reading activity for calendar
}

export interface ProgressHistoryEntry {
  id: string;
  user_id: string;
  user_book_id: string;
  progress: number;
  capacity: number | null;
  status: string;
  pages_read: number;
  recorded_at: string;
}

// Get reading statistics for a user
export async function getReadingStats(
  targetUserId?: string
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

  // If viewing another user's stats, check privacy settings
  if (!isOwnStats) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_stats_public")
      .eq("id", userId)
      .single();

    if (!profile?.is_stats_public) {
      return { data: null, error: "Statistics are private" };
    }
  }

  // Get all progress history
  const { data: history, error: historyError } = await supabase
    .from("reading_progress_history")
    .select("*")
    .eq("user_id", userId)
    .order("recorded_at", { ascending: true });

  if (historyError) {
    console.error("Error fetching progress history:", historyError);
    return { data: null, error: historyError.message };
  }

  // Get completed books
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

  // Calculate statistics
  const stats = calculateStats(history || [], completedBooks || []);

  return { data: stats, error: null };
}

function calculateStats(
  history: ProgressHistoryEntry[],
  completedBooks: {
    id: string;
    title: string;
    cover?: string | null;
    updated_at: string;
  }[]
): ReadingStats {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  // Calculate date ranges
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(now);
  monthAgo.setDate(monthAgo.getDate() - 30);

  // Total pages read
  const totalPagesRead = history.reduce(
    (sum, entry) => sum + (entry.pages_read || 0),
    0
  );

  // Pages this week and month
  const pagesThisWeek = history
    .filter((entry) => new Date(entry.recorded_at) >= weekAgo)
    .reduce((sum, entry) => sum + (entry.pages_read || 0), 0);

  const pagesThisMonth = history
    .filter((entry) => new Date(entry.recorded_at) >= monthAgo)
    .reduce((sum, entry) => sum + (entry.pages_read || 0), 0);

  // Daily activity for the last 30 days
  const dailyActivity = getDailyActivity(history, 30);

  // Reading days for calendar (all unique days with activity)
  const readingDays = [
    ...new Set(
      history
        .filter((entry) => entry.pages_read > 0)
        .map((entry) => new Date(entry.recorded_at).toISOString().split("T")[0])
    ),
  ];

  // Calculate streaks
  const { currentStreak, longestStreak } = calculateStreaks(
    readingDays,
    todayStr
  );

  return {
    totalPagesRead,
    totalBooksCompleted: completedBooks.length,
    currentStreak,
    longestStreak,
    pagesThisWeek,
    pagesThisMonth,
    dailyActivity,
    completedBooks: completedBooks.map((book) => ({
      id: book.id,
      title: book.title,
      cover: book.cover,
      completedAt: book.updated_at,
    })),
    readingDays,
  };
}

function getDailyActivity(
  history: ProgressHistoryEntry[],
  days: number
): { date: string; pages: number }[] {
  const now = new Date();
  const result: { date: string; pages: number }[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];

    const pages = history
      .filter((entry) => {
        const entryDate = new Date(entry.recorded_at)
          .toISOString()
          .split("T")[0];
        return entryDate === dateStr;
      })
      .reduce((sum, entry) => sum + (entry.pages_read || 0), 0);

    result.push({ date: dateStr, pages });
  }

  return result;
}

function calculateStreaks(
  readingDays: string[],
  todayStr: string
): { currentStreak: number; longestStreak: number } {
  if (readingDays.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // Sort days in descending order (most recent first)
  const sortedDays = [...readingDays].sort((a, b) => b.localeCompare(a));

  // Calculate current streak
  let currentStreak = 0;
  const today = new Date(todayStr);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  // Check if user read today or yesterday to start counting streak
  if (sortedDays[0] === todayStr || sortedDays[0] === yesterdayStr) {
    let expectedDate = new Date(sortedDays[0]);

    for (const day of sortedDays) {
      const dayDate = new Date(day);
      const expectedStr = expectedDate.toISOString().split("T")[0];

      if (day === expectedStr) {
        currentStreak++;
        expectedDate.setDate(expectedDate.getDate() - 1);
      } else if (day < expectedStr) {
        // Gap found, stop counting
        break;
      }
    }
  }

  // Calculate longest streak
  let longestStreak = 0;
  let tempStreak = 1;

  // Sort ascending for longest streak calculation
  const ascendingSortedDays = [...readingDays].sort((a, b) =>
    a.localeCompare(b)
  );

  for (let i = 1; i < ascendingSortedDays.length; i++) {
    const prevDate = new Date(ascendingSortedDays[i - 1]);
    const currDate = new Date(ascendingSortedDays[i]);

    // Check if consecutive days
    const diffTime = currDate.getTime() - prevDate.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    if (diffDays === 1) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }

  longestStreak = Math.max(longestStreak, tempStreak);

  return { currentStreak, longestStreak };
}

// Get public stats for a specific user (used when viewing other profiles)
export async function getPublicStats(
  userId: string
): Promise<{
  data: ReadingStats | null;
  error: string | null;
  isPublic: boolean;
}> {
  const supabase = await createClient();

  // Check if user's stats are public
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_stats_public")
    .eq("id", userId)
    .single();

  if (!profile?.is_stats_public) {
    return { data: null, error: null, isPublic: false };
  }

  const result = await getReadingStats(userId);
  return { ...result, isPublic: true };
}
