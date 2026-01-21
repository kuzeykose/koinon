import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PomodoroTimer } from "@/components/pomodoro/pomodoro-timer";

export default async function PomodoroPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch user's currently reading books for the book selector
  const { data: userBooks } = await supabase
    .from("user_books")
    .select("id, title, cover, authors")
    .eq("user_id", user.id)
    .eq("status", "IS_READING")
    .order("updated_at", { ascending: false });

  const books = userBooks || [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pomodoro Timer</h1>
        <p className="text-muted-foreground mt-2">
          Focus on your reading with timed work sessions.
        </p>
      </div>

      <PomodoroTimer books={books} />
    </div>
  );
}
