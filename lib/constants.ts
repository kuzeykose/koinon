export const WEEK_START_DAYS = ["monday", "sunday"] as const;

export type WeekStartDay = (typeof WEEK_START_DAYS)[number];

export const WEEK_START_DAY_LABELS: Record<WeekStartDay, string> = {
  monday: "Monday",
  sunday: "Sunday",
};

export const DEFAULT_WEEK_START_DAY: WeekStartDay = "monday";
