"use client";

import * as React from "react";
import useSWR from "swr";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  XAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { type TimeRange } from "@/lib/actions/stats";
import { chartDataFetcher } from "@/lib/actions/stats/fetcher";
import { weekStartFetcher } from "@/lib/actions/stats/week-start-fetcher";
import { DEFAULT_WEEK_START_DAY } from "@/lib/constants";
import { Loader2 } from "lucide-react";

interface ReadingChartProps {
  initialTimeRange?: TimeRange;
}

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function InteractiveLegend({
  bookIds,
  bookMetadata,
  visibleBooks,
  bookColorMap,
  onToggleBook,
}: {
  bookIds: string[];
  bookMetadata: Record<string, { title: string }>;
  visibleBooks: Set<string>;
  bookColorMap: Map<string, string>;
  onToggleBook: (bookId: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
      {bookIds.map((bookId) => {
        const isVisible = visibleBooks.has(bookId);
        const color = bookColorMap.get(bookId) || CHART_COLORS[0];
        return (
          <button
            key={bookId}
            onClick={() => onToggleBook(bookId)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2 py-1 text-sm transition-all",
              "hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              !isVisible && "opacity-40"
            )}
            aria-label={`${isVisible ? "Hide" : "Show"} ${bookMetadata[bookId]?.title || bookId}`}
          >
            <div
              className="h-2.5 w-2.5 rounded-[2px] shrink-0"
              style={{ backgroundColor: color }}
            />
            <span className={cn(!isVisible && "line-through text-muted-foreground")}>
              {bookMetadata[bookId]?.title || bookId}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function ReadingChart({
  initialTimeRange = "30d",
}: ReadingChartProps) {
  const [timeRange, setTimeRange] = React.useState<TimeRange>(initialTimeRange);
  const [visibleBooks, setVisibleBooks] = React.useState<Set<string>>(
    new Set()
  );
  const [totalOnly, setTotalOnly] = React.useState(false);
  const [minBooksFilter, setMinBooksFilter] = React.useState<number | null>(
    null
  );

  const { data: weekStartDay = DEFAULT_WEEK_START_DAY } = useSWR(
    "week-start",
    weekStartFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  const { data: chartData, error, isLoading } = useSWR(
    `chart:${timeRange}:${weekStartDay}`,
    chartDataFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  const bookIds = React.useMemo(() => {
    if (!chartData) return [];
    const allBookIds = Object.keys(chartData.bookMetadata);
    return allBookIds.filter((bookId) => {
      return chartData.dailyActivityByBook.some(
        (day) => (Number(day[bookId]) || 0) > 0
      );
    });
  }, [chartData]);

  const bookColorMap = React.useMemo(() => {
    const colorMap = new Map<string, string>();
    bookIds.forEach((bookId, index) => {
      colorMap.set(bookId, CHART_COLORS[index % CHART_COLORS.length]);
    });
    return colorMap;
  }, [bookIds]);

  React.useEffect(() => {
    if (bookIds.length > 0 && visibleBooks.size === 0) {
      setVisibleBooks(new Set(bookIds));
    }
  }, [bookIds, visibleBooks.size]);

  const filteredChartData = React.useMemo(() => {
    if (!chartData) return [];

    const chartDataWithTotals = chartData.dailyActivityByBook.map((day) => {
      const total = bookIds.reduce((sum, bookId) => {
        return sum + (Number(day[bookId]) || 0);
      }, 0);
      return { ...day, total };
    });

    return chartDataWithTotals
      .map((day) => {
        if (totalOnly) {
          return { date: day.date, total: day.total };
        }
        const filteredDay: Record<string, string | number> = { ...day };
        bookIds.forEach((bookId) => {
          if (!visibleBooks.has(bookId)) {
            delete filteredDay[bookId];
          }
        });
        return filteredDay;
      })
      .filter((day) => {
        if (day.total === 0) return false;
        if (totalOnly) return true;
        if (minBooksFilter === null) return true;
        const dayRecord = day as Record<string, string | number>;
        const activeBooks = bookIds.filter(
          (bookId) =>
            visibleBooks.has(bookId) &&
            (Number(dayRecord[bookId]) || 0) > 0
        );
        if (minBooksFilter === 1) {
          return activeBooks.length === 1;
        }
        return activeBooks.length >= minBooksFilter;
      });
  }, [chartData, visibleBooks, minBooksFilter, bookIds, totalOnly]);

  const patternFilterValue =
    minBooksFilter === null
      ? "all"
      : minBooksFilter === 1
        ? "single"
        : minBooksFilter === 2
          ? "multi"
          : "all";

  const handlePatternFilterChange = (value: string) => {
    if (value === "all") {
      setMinBooksFilter(null);
    } else if (value === "single") {
      setMinBooksFilter(1);
    } else if (value === "multi") {
      setMinBooksFilter(2);
    }
  };

  const handleToggleBook = (bookId: string) => {
    const newVisible = new Set(visibleBooks);
    if (newVisible.has(bookId)) {
      newVisible.delete(bookId);
    } else {
      newVisible.add(bookId);
    }
    setVisibleBooks(newVisible);
  };

  const visibleBookIds = bookIds.filter((bookId) => visibleBooks.has(bookId));

  const chartConfig: ChartConfig = (() => {
    if (!chartData) return {};
    const config: ChartConfig = {
      reading: {
        label: "Reading Activity",
      },
      total: {
        label: "Total Pages",
        color: totalOnly ? "var(--chart-1)" : "hsl(var(--foreground))",
      },
    };
    if (!totalOnly) {
      visibleBookIds.forEach((bookId) => {
        const color = bookColorMap.get(bookId) || CHART_COLORS[0];
        config[bookId] = {
          label: chartData.bookMetadata[bookId]?.title || bookId,
          color,
        };
      });
    }
    return config;
  })();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">
            Reading Activity
          </CardTitle>
          <CardDescription>Loading chart data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">
            Reading Activity
          </CardTitle>
          <CardDescription>Error loading chart</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center text-muted-foreground">
            <p className="text-sm text-destructive">
              {error instanceof Error ? error.message : "Failed to load chart"}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!chartData || chartData.dailyActivityByBook.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">
            Reading Activity
          </CardTitle>
          <CardDescription>No reading activity data available</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center text-muted-foreground">
            <p className="text-sm">No reading activity data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }


  return (
    <Card className="pt-0">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle className="text-lg font-semibold">
            Reading Activity
          </CardTitle>
          <CardDescription>
            Showing reading activity by book for the selected period
          </CardDescription>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="hidden text-sm text-muted-foreground sm:flex gap-4">
            <span>
              Total:{" "}
              <span className="font-medium text-foreground">
                {chartData.totalPages.toLocaleString("en-US")}
              </span>{" "}
              pages
            </span>
            <span>
              Avg:{" "}
              <span className="font-medium text-foreground">
                {chartData.avgPages}
              </span>{" "}
              pages/day
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="total-only"
              checked={totalOnly}
              onCheckedChange={setTotalOnly}
              aria-label="Show total only"
            />
            <Label
              htmlFor="total-only"
              className="text-sm font-normal cursor-pointer whitespace-nowrap"
            >
              Total only
            </Label>
          </div>
          <Select
            value={timeRange}
            onValueChange={(value) => setTimeRange(value as TimeRange)}
          >
            <SelectTrigger
              className="w-[160px] rounded-lg"
              aria-label="Select time range"
            >
              <SelectValue placeholder="Last 30 days" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="7d" className="rounded-lg">
                Last 7 days
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                Last 30 days
              </SelectItem>
              <SelectItem value="90d" className="rounded-lg">
                Last 3 months
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {!totalOnly && visibleBookIds.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-muted-foreground">
            <p className="text-sm">No books selected for display</p>
          </div>
        ) : filteredChartData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-muted-foreground">
            <p className="text-sm">No data matches the selected filters</p>
          </div>
        ) : (
          <>
            <ChartContainer
              config={chartConfig}
              className="aspect-auto h-[250px] w-full"
            >
            <AreaChart data={filteredChartData}>
              <defs>
                {totalOnly ? (
                  <linearGradient id="fillTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--color-total)"
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--color-total)"
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                ) : (
                  visibleBookIds.map((bookId) => {
                    const color = bookColorMap.get(bookId) || CHART_COLORS[0];
                    return (
                      <linearGradient
                        key={bookId}
                        id={`fill${bookId}`}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={color}
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor={color}
                          stopOpacity={0.1}
                        />
                      </linearGradient>
                    );
                  })
                )}
              </defs>

              <CartesianGrid vertical={false} />

              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  });
                }}
              />
              <ChartTooltip
                cursor={false}
                content={(props) => {
                  if (!props.active || !props.payload?.length) {
                    return null;
                  }

                  const totalEntry = props.payload.find(
                    (item) => item.name === "total"
                  );
                  const totalPages = totalEntry
                    ? Number(totalEntry.value) || 0
                    : props.payload.reduce((sum, item) => {
                        if (item.name === "total") return sum;
                        return sum + (Number(item.value) || 0);
                      }, 0);

                  const formattedDate = new Date(
                    props.label as string
                  ).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });

                  if (totalOnly) {
                    const totalColor = totalEntry?.color || "var(--color-total)";
                    return (
                      <div className="border-border/50 bg-background grid min-w-48 items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl">
                        <div className="font-medium">{formattedDate}</div>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                              style={{
                                backgroundColor: totalColor,
                              }}
                            />
                            <span className="font-semibold text-foreground">
                              Total
                            </span>
                          </div>
                          <span className="text-foreground font-mono font-semibold tabular-nums shrink-0 whitespace-nowrap text-right">
                            {totalPages.toLocaleString("en-US")} pages
                          </span>
                        </div>
                      </div>
                    );
                  }

                  const bookEntries = props.payload
                    .filter((item) => {
                      if (item.name === "total") return false;
                      const pages = Number(item.value) || 0;
                      return pages > 0 && visibleBooks.has(item.name as string);
                    })
                    .map((item) => {
                      const bookId = item.name as string;
                      const pages = Number(item.value) || 0;
                      const color = bookColorMap.get(bookId) || CHART_COLORS[0];
                      const bookTitle =
                        chartData.bookMetadata[bookId]?.title || bookId;

                      return {
                        key: item.dataKey,
                        bookId,
                        pages,
                        color,
                        bookTitle,
                      };
                    });

                  return (
                    <div className="border-border/50 bg-background grid min-w-48 items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl">
                      <div className="font-medium">{formattedDate}</div>

                      <div className="grid gap-1.5">
                        {bookEntries.map((entry) => (
                          <div
                            key={entry.key}
                            className="flex w-full items-center gap-2 min-w-0"
                          >
                            <div
                              className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                              style={{ backgroundColor: entry.color }}
                            />
                            <div className="flex flex-1 items-center justify-between gap-3 min-w-0">
                              <span className="text-muted-foreground truncate min-w-0">
                                {entry.bookTitle}
                              </span>
                              <span className="text-foreground font-mono font-medium tabular-nums shrink-0 whitespace-nowrap text-right">
                                {entry.pages.toLocaleString("en-US")} pages
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {totalPages > 0 && (
                        <div className="border-t border-border/50 pt-1.5 mt-1">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <div
                                className="h-2.5 w-2.5 shrink-0 rounded-[2px] border-2"
                                style={{
                                  borderColor: "hsl(var(--foreground))",
                                  backgroundColor: "transparent",
                                }}
                              />
                              <span className="font-semibold text-foreground">
                                Total
                              </span>
                            </div>
                            <span className="text-foreground font-mono font-semibold tabular-nums shrink-0 whitespace-nowrap text-right">
                              {totalPages.toLocaleString("en-US")} pages
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }}
              />

              {!totalOnly &&
                visibleBookIds.map((bookId) => {
                  const color = bookColorMap.get(bookId) || CHART_COLORS[0];
                  return (
                    <Area
                      key={bookId}
                      dataKey={bookId}
                      type="natural"
                      fill={`url(#fill${bookId})`}
                      stroke={color}
                      stackId="a"
                    />
                  );
                })}

              {totalOnly ? (
                <Area
                  dataKey="total"
                  type="natural"
                  fill="url(#fillTotal)"
                  stroke="var(--color-total)"
                  stackId="a"
                />
              ) : (
                <Line
                  dataKey="total"
                  type="monotone"
                  stroke="hsl(var(--foreground))"
                  strokeWidth={3}
                  strokeDasharray="5 5"
                  dot={{ fill: "hsl(var(--foreground))", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              )}
            </AreaChart>
          </ChartContainer>
          </>
        )}
        {!totalOnly && (
          <InteractiveLegend
            bookIds={bookIds}
            bookMetadata={chartData.bookMetadata}
            visibleBooks={visibleBooks}
            bookColorMap={bookColorMap}
            onToggleBook={handleToggleBook}
          />
        )}
        <div className="flex items-center justify-center gap-4 pt-4 flex-wrap">
          <ToggleGroup
            type="single"
            value={patternFilterValue}
            onValueChange={handlePatternFilterChange}
            className="gap-1"
            aria-label="Filter by reading pattern"
          >
            <ToggleGroupItem value="all" aria-label="All days">
              All Days
            </ToggleGroupItem>
            <ToggleGroupItem value="multi" aria-label="Multi-book days">
              Multi-book
            </ToggleGroupItem>
            <ToggleGroupItem value="single" aria-label="Single-book days">
              Single-book
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </CardContent>
    </Card>
  );
}
