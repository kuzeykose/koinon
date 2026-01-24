export interface ReadingStats {
  totalPagesRead: number;
  totalBooksCompleted: number;
  currentStreak: number;
  longestStreak: number;
  pagesThisWeek: number;
  pagesThisMonth: number;
  dailyActivity: { date: string; pages: number }[];
  dailyActivityByBook: { date: string; [bookId: string]: string | number }[];
  bookMetadata: Record<string, { title: string; id: string }>;
  completedBooks: {
    id: string;
    title: string;
    cover?: string | null;
    completedAt: string;
  }[];
  readingDays: string[];
}

export interface ChartData {
  dailyActivityByBook: { date: string; [bookId: string]: string | number }[];
  bookMetadata: Record<string, { title: string; id: string }>;
  totalPages: number;
  daysWithReading: number;
  avgPages: number;
}

export type TimeRange = "7d" | "30d" | "90d";

export interface ProgressHistoryEntry {
  id: string;
  user_id: string;
  user_book_id: string;
  progress: number;
  capacity: number | null;
  status: string;
  pages_read: number;
  recorded_at: string;
  user_books: {
    id: string;
    title: string;
  };
}
