import { getUserWeekStartDay } from "./get-week-start";
import type { WeekStartDay } from "@/lib/constants";

export async function weekStartFetcher(): Promise<WeekStartDay> {
  return getUserWeekStartDay();
}
