import {
  DEFAULT_WEEK_START_DAY,
  type WeekStartDay,
} from "@/lib/constants";
import type {
  ProgressHistoryEntry,
  ReadingStats,
} from "./types";

export function getStartOfWeek(
  date: Date,
  weekStartDay: WeekStartDay,
  timezone?: string
): Date {
  const startOfWeek = new Date(date);

  if (timezone) {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "long",
    });
    const dayName = formatter.format(date).toLowerCase();

    let dayOfWeek: number;
    if (weekStartDay === "monday") {
      const dayMap: Record<string, number> = {
        monday: 0,
        tuesday: 1,
        wednesday: 2,
        thursday: 3,
        friday: 4,
        saturday: 5,
        sunday: 6,
      };
      dayOfWeek = dayMap[dayName] || 0;
    } else {
      const dayMap: Record<string, number> = {
        sunday: 0,
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
      };
      dayOfWeek = dayMap[dayName] || 0;
    }

    for (let i = 0; i < dayOfWeek; i++) {
      startOfWeek.setUTCDate(startOfWeek.getUTCDate() - 1);
    }
    startOfWeek.setUTCHours(0, 0, 0, 0);
  } else {
    const dayOfWeek =
      weekStartDay === "monday" ? (date.getDay() + 6) % 7 : date.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);
  }

  return startOfWeek;
}

function formatDate(date: Date, timezone?: string): string {
  if (timezone) {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(date);
  } else {
    date.setUTCHours(0, 0, 0, 0);
    return date.toISOString().split("T")[0];
  }
}

export function getDailyActivity(
  history: ProgressHistoryEntry[],
  days: number,
  timezone?: string
): { date: string; pages: number }[] {
  const now = new Date();
  const result: { date: string; pages: number }[] = [];
  const pagesByDate = new Map<string, number>();

  for (const entry of history) {
    const entryDate = new Date(entry.recorded_at);
    const dateStr = formatDate(entryDate, timezone);
    const currentPages = pagesByDate.get(dateStr) || 0;
    pagesByDate.set(dateStr, currentPages + (entry.pages_read || 0));
  }

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = formatDate(date, timezone);
    result.push({ date: dateStr, pages: pagesByDate.get(dateStr) || 0 });
  }

  return result;
}

export function getDailyActivityByBook(
  history: ProgressHistoryEntry[],
  days: number,
  timezone?: string
): {
  dailyActivityByBook: { date: string; [bookId: string]: string | number }[];
  bookMetadata: Record<string, { title: string; id: string }>;
} {
  const now = new Date();
  const result: { date: string; [bookId: string]: string | number }[] = [];
  const pagesByDateAndBook = new Map<string, Map<string, number>>();
  const bookMetadata: Record<string, { title: string; id: string }> = {};

  for (const entry of history) {
    const bookId = entry.user_book_id;
    const bookTitle = entry.user_books.title;
  
    bookMetadata[bookId] = { title: bookTitle, id: bookId };
  
    const entryDate = new Date(entry.recorded_at);
    const dateStr = formatDate(entryDate, timezone);
  
    if (!pagesByDateAndBook.has(dateStr)) {
      pagesByDateAndBook.set(dateStr, new Map());
    }
  
    const bookMap = pagesByDateAndBook.get(dateStr)!;
    const currentPages = bookMap.get(bookId) || 0;
    bookMap.set(bookId, currentPages + (entry.pages_read || 0));
  }  

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = formatDate(date, timezone);

    const dayData: { date: string; [bookId: string]: string | number } = {
      date: dateStr,
    };

    const bookMap = pagesByDateAndBook.get(dateStr);
    if (bookMap) {
      for (const [bookId, pages] of bookMap.entries()) {
        dayData[bookId] = pages;
      }
    }

    for (const bookId of Object.keys(bookMetadata)) {
      if (!(bookId in dayData)) {
        dayData[bookId] = 0;
      }
    }

    result.push(dayData);
  }

  return { dailyActivityByBook: result, bookMetadata };
}

function getPreviousDay(dateStr: string, timezone?: string): string {
  if (timezone) {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const [year, month, day] = dateStr.split("-").map(Number);

    const checkHour = (hour: number): Date | null => {
      const candidateUTC = new Date(
        Date.UTC(year, month - 1, day, hour, 0, 0)
      );
      return formatter.format(candidateUTC) === dateStr ? candidateUTC : null;
    };

    let baseDateUTC =
      checkHour(12) || checkHour(0) || checkHour(6) || checkHour(18);

    if (!baseDateUTC) {
      for (let hour = 0; hour < 24; hour++) {
        const candidate = checkHour(hour);
        if (candidate) {
          baseDateUTC = candidate;
          break;
        }
      }
    }

    if (!baseDateUTC) {
      baseDateUTC = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    }

    const prevDayUTC = new Date(baseDateUTC);
    prevDayUTC.setUTCDate(prevDayUTC.getUTCDate() - 1);
    return formatter.format(prevDayUTC);
  } else {
    const date = new Date(dateStr);
    date.setDate(date.getDate() - 1);
    return date.toISOString().split("T")[0];
  }
}

export function calculateStreaks(
  readingDays: string[],
  todayStr: string,
  timezone?: string
): { currentStreak: number; longestStreak: number } {
  if (readingDays.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  const sortedDays = [...readingDays].sort((a, b) => b.localeCompare(a));

  let currentStreak = 0;
  const yesterdayStr = getPreviousDay(todayStr, timezone);

  if (sortedDays[0] === todayStr || sortedDays[0] === yesterdayStr) {
    let expectedDateStr = sortedDays[0];

    for (const day of sortedDays) {
      if (day === expectedDateStr) {
        currentStreak++;
        expectedDateStr = getPreviousDay(expectedDateStr, timezone);
      } else if (day < expectedDateStr) {
        break;
      }
    }
  }

  let longestStreak = 0;
  let tempStreak = 1;

  const ascendingSortedDays = [...readingDays].sort((a, b) =>
    a.localeCompare(b)
  );

  for (let i = 1; i < ascendingSortedDays.length; i++) {
    const prevStr = ascendingSortedDays[i - 1];
    const currStr = ascendingSortedDays[i];
    const expectedNextStr = getPreviousDay(currStr, timezone);

    if (prevStr === expectedNextStr) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }

  longestStreak = Math.max(longestStreak, tempStreak);

  return { currentStreak, longestStreak };
}

export function calculateStats(
  history: ProgressHistoryEntry[],
  completedBooks: {
    id: string;
    title: string;
    cover?: string | null;
    updated_at: string;
  }[],
  timezone?: string,
  weekStartDay: WeekStartDay = DEFAULT_WEEK_START_DAY
): ReadingStats {
  const now = new Date();
  const todayStr = formatDate(now, timezone);
  const startOfCurrentWeek = getStartOfWeek(now, weekStartDay, timezone);
  const monthAgo = new Date(now);
  monthAgo.setDate(monthAgo.getDate() - 30);

  const totalPagesRead = history.reduce(
    (sum, entry) => sum + (entry.pages_read || 0),
    0
  );

  const pagesThisWeek = history
    .filter((entry) => new Date(entry.recorded_at) >= startOfCurrentWeek)
    .reduce((sum, entry) => sum + (entry.pages_read || 0), 0);

  const pagesThisMonth = history
    .filter((entry) => new Date(entry.recorded_at) >= monthAgo)
    .reduce((sum, entry) => sum + (entry.pages_read || 0), 0);

  const dailyActivity = getDailyActivity(history, 30, timezone);
  const { dailyActivityByBook, bookMetadata } = getDailyActivityByBook(
    history,
    30,
    timezone
  );

  const readingDaysSet = new Set<string>();
  for (const entry of history) {
    if (entry.pages_read > 0) {
      const entryDate = new Date(entry.recorded_at);
      const dateStr = formatDate(entryDate, timezone);
      readingDaysSet.add(dateStr);
    }
  }
  const readingDays = Array.from(readingDaysSet);

  const { currentStreak, longestStreak } = calculateStreaks(
    readingDays,
    todayStr,
    timezone
  );

  return {
    totalPagesRead,
    totalBooksCompleted: completedBooks.length,
    currentStreak,
    longestStreak,
    pagesThisWeek,
    pagesThisMonth,
    dailyActivity,
    dailyActivityByBook,
    bookMetadata,
    completedBooks: completedBooks.map((book) => ({
      id: book.id,
      title: book.title,
      cover: book.cover,
      completedAt: book.updated_at,
    })),
    readingDays,
  };
}
