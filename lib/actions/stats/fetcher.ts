import { getChartData } from "./chart-actions";
import type { TimeRange } from "./types";
import type { ChartData } from "./types";

export async function chartDataFetcher(
  key: string
): Promise<ChartData | null> {
  const [, timeRange] = key.split(":");
  const result = await getChartData(timeRange as TimeRange);
  if (result.error) {
    throw new Error(result.error);
  }
  return result.data;
}
