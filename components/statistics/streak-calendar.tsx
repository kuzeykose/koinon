"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame } from "lucide-react";

interface StreakCalendarProps {
  readingDays: string[];
}

export function StreakCalendar({ readingDays }: StreakCalendarProps) {
  const readingDaysSet = useMemo(() => new Set(readingDays), [readingDays]);

  const calendarData = useMemo(() => {
    const today = new Date();
    const weeks: { date: Date; hasActivity: boolean }[][] = [];

    // Go back 12 weeks (84 days)
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 83);

    // Adjust to start from Sunday
    const dayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - dayOfWeek);

    let currentWeek: { date: Date; hasActivity: boolean }[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= today) {
      const dateStr = currentDate.toISOString().split("T")[0];
      const hasActivity = readingDaysSet.has(dateStr);

      currentWeek.push({
        date: new Date(currentDate),
        hasActivity,
      });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Add remaining days
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    return weeks;
  }, [readingDaysSet]);

  const months = useMemo(() => {
    const monthLabels: { name: string; startWeek: number }[] = [];
    let currentMonth = -1;

    calendarData.forEach((week, weekIndex) => {
      const firstDayOfWeek = week[0]?.date;
      if (firstDayOfWeek) {
        const month = firstDayOfWeek.getMonth();
        if (month !== currentMonth) {
          currentMonth = month;
          monthLabels.push({
            name: firstDayOfWeek.toLocaleDateString("en-US", {
              month: "short",
            }),
            startWeek: weekIndex,
          });
        }
      }
    });

    return monthLabels;
  }, [calendarData]);

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" />
          Reading Calendar
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {/* Month labels */}
          <div className="flex text-xs text-muted-foreground ml-8">
            {months.map((month, index) => (
              <div
                key={`${month.name}-${index}`}
                className="flex-shrink-0"
                style={{
                  marginLeft:
                    index === 0
                      ? 0
                      : `${
                          (months[index].startWeek -
                            months[index - 1].startWeek -
                            1) *
                          14
                        }px`,
                  width: "28px",
                }}
              >
                {month.name}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="flex gap-2">
            {/* Day labels */}
            <div className="flex flex-col gap-[2px] text-xs text-muted-foreground">
              {weekDays.map((day, index) => (
                <div
                  key={day}
                  className="h-3 flex items-center"
                  style={{ visibility: index % 2 === 1 ? "visible" : "hidden" }}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Weeks */}
            <div className="flex gap-[2px]">
              {calendarData.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-[2px]">
                  {week.map((day, dayIndex) => {
                    const isToday =
                      day.date.toDateString() === new Date().toDateString();
                    const isFuture = day.date > new Date();

                    return (
                      <div
                        key={`${weekIndex}-${dayIndex}`}
                        className={`w-3 h-3 rounded-sm transition-colors ${
                          isFuture
                            ? "bg-transparent"
                            : day.hasActivity
                            ? "bg-emerald-500 hover:bg-emerald-400"
                            : "bg-muted hover:bg-muted-foreground/20"
                        } ${
                          isToday
                            ? "ring-1 ring-primary ring-offset-1 ring-offset-background"
                            : ""
                        }`}
                        title={`${day.date.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}${day.hasActivity ? " - Read" : ""}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex justify-end gap-2 items-center text-xs text-muted-foreground mt-2">
            <span>Less</span>
            <div className="w-3 h-3 rounded-sm bg-muted" />
            <div className="w-3 h-3 rounded-sm bg-emerald-500/30" />
            <div className="w-3 h-3 rounded-sm bg-emerald-500/60" />
            <div className="w-3 h-3 rounded-sm bg-emerald-500" />
            <span>More</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
