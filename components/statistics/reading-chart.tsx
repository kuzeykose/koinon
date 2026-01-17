"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ReadingChartProps {
  dailyActivity: { date: string; pages: number }[];
}

export function ReadingChart({ dailyActivity }: ReadingChartProps) {
  const maxPages = useMemo(() => {
    return Math.max(...dailyActivity.map((d) => d.pages), 1);
  }, [dailyActivity]);

  const chartData = useMemo(() => {
    // Get last 30 days of data
    return dailyActivity.slice(-30);
  }, [dailyActivity]);

  const totalPages = useMemo(() => {
    return chartData.reduce((sum, d) => sum + d.pages, 0);
  }, [chartData]);

  const avgPages = useMemo(() => {
    const daysWithReading = chartData.filter((d) => d.pages > 0).length;
    return daysWithReading > 0 ? Math.round(totalPages / daysWithReading) : 0;
  }, [chartData, totalPages]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            Reading Activity
          </CardTitle>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>
              Total:{" "}
              <span className="font-medium text-foreground">
                {totalPages.toLocaleString()}
              </span>{" "}
              pages
            </span>
            <span>
              Avg:{" "}
              <span className="font-medium text-foreground">{avgPages}</span>{" "}
              pages/day
            </span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Last 30 days</p>
      </CardHeader>
      <CardContent>
        <div className="h-48 flex items-end gap-1">
          {chartData.map((day, index) => {
            const height = maxPages > 0 ? (day.pages / maxPages) * 100 : 0;
            const date = new Date(day.date);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;

            return (
              <div
                key={day.date}
                className="flex-1 flex flex-col items-center gap-1 group relative"
              >
                <div
                  className={`w-full rounded-t transition-all duration-200 ${
                    day.pages > 0
                      ? "bg-emerald-500 hover:bg-emerald-400"
                      : "bg-muted"
                  }`}
                  style={{ height: `${Math.max(height, 2)}%` }}
                />

                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                  <div className="bg-popover text-popover-foreground text-xs rounded-lg px-3 py-2 shadow-lg border whitespace-nowrap">
                    <p className="font-medium">
                      {date.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    <p className="text-muted-foreground">{day.pages} pages</p>
                  </div>
                </div>

                {/* Date labels - show every 5th day */}
                {(index === 0 ||
                  index === chartData.length - 1 ||
                  (index + 1) % 7 === 0) && (
                  <span
                    className={`text-[10px] ${
                      isWeekend
                        ? "text-muted-foreground/50"
                        : "text-muted-foreground"
                    }`}
                  >
                    {date.getDate()}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-6 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-emerald-500" />
            <span>Pages read</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-muted" />
            <span>No activity</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
