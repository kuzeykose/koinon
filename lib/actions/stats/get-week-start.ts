"use server";

import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_WEEK_START_DAY,
  type WeekStartDay,
} from "@/lib/constants";

export async function getUserWeekStartDay(): Promise<WeekStartDay> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return DEFAULT_WEEK_START_DAY;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("week_start_day")
    .eq("id", user.id)
    .single();

  return (profile?.week_start_day as WeekStartDay) || DEFAULT_WEEK_START_DAY;
}
