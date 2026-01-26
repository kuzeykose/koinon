import { createClient } from "@/lib/supabase/server";
import { getReadingStats } from "@/lib/actions/stats-actions";
import { StatsOverview } from "@/components/statistics/stats-overview";
import { ReadingChart } from "@/components/statistics/reading-chart";
import { BooksTimeline } from "@/components/statistics/books-timeline";
import { StreakCalendar } from "@/components/statistics/streak-calendar";

export default async function StatisticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container max-w-6xl py-8">
          <p className="text-muted-foreground">
            Please log in to view your statistics.
          </p>
        </main>
      </div>
    );
  }

  const { data: stats, error } = await getReadingStats();

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container max-w-6xl py-8">
          <p className="text-destructive">Error loading statistics: {error}</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Reading Statistics
          </h1>
          <p className="text-muted-foreground">
            Track your reading progress and achievements
          </p>
        </div>

        {stats ? (
          <div className="space-y-8">
            {/* Overview Cards */}
            <StatsOverview stats={stats} />

            {/* Reading Activity Chart */}
            <ReadingChart />

            <div className="grid gap-8 lg:grid-cols-2">
              {/* Streak Calendar */}
              <StreakCalendar readingDays={stats.readingDays} />

              {/* Completed Books Timeline */}
              <BooksTimeline completedBooks={stats.completedBooks} />
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              No reading activity yet. Start reading to see your statistics!
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
