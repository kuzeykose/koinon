"use client";

import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Flame, Calendar, TrendingUp } from "lucide-react";
import type { ReadingStats } from "@/lib/actions/stats";

interface StatsOverviewProps {
  stats: ReadingStats;
}

export function StatsOverview({ stats }: StatsOverviewProps) {
  const formatNumber = (num: number) => {
    return num.toLocaleString("en-US");
  };

  const statCards = [
    {
      title: "Total Pages Read",
      value: formatNumber(stats.totalPagesRead),
      description: `${formatNumber(stats.pagesThisMonth)} this month`,
      icon: BookOpen,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Books Completed",
      value: stats.totalBooksCompleted.toString(),
      description: "All time",
      icon: TrendingUp,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      title: "Current Streak",
      value: `${stats.currentStreak} days`,
      description: `Longest: ${stats.longestStreak} days`,
      icon: Flame,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      title: "This Week",
      value: formatNumber(stats.pagesThisWeek),
      description: "Pages read",
      icon: Calendar,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat) => (
        <Card key={stat.title} className="overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground truncate">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold tracking-tight">
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
