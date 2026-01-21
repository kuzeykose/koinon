import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export interface PomodoroSession {
  id: string;
  user_id: string;
  user_book_id: string | null;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number;
  completed: boolean;
  session_type: "work" | "break";
  created_at: string;
}

// POST: Create a new pomodoro session
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { user_book_id, duration_minutes, session_type } = body;

    // Validate required fields
    if (!duration_minutes || typeof duration_minutes !== "number") {
      return NextResponse.json(
        { error: "duration_minutes is required and must be a number" },
        { status: 400 }
      );
    }

    if (!session_type || !["work", "break"].includes(session_type)) {
      return NextResponse.json(
        { error: "session_type must be 'work' or 'break'" },
        { status: 400 }
      );
    }

    // If user_book_id is provided, verify it belongs to the user
    if (user_book_id) {
      const { data: userBook, error: bookError } = await supabase
        .from("user_books")
        .select("id")
        .eq("id", user_book_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (bookError || !userBook) {
        return NextResponse.json(
          { error: "Invalid user_book_id" },
          { status: 400 }
        );
      }
    }

    const { data, error } = await supabase
      .from("pomodoro_sessions")
      .insert({
        user_id: user.id,
        user_book_id: user_book_id || null,
        started_at: new Date().toISOString(),
        duration_minutes,
        session_type,
        completed: false,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create pomodoro session:", error);
      return NextResponse.json(
        { error: "Failed to create session" },
        { status: 500 }
      );
    }

    return NextResponse.json({ session: data }, { status: 201 });
  } catch (error) {
    console.error("Pomodoro create error:", error);
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}

// PATCH: Update a pomodoro session (mark as completed)
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { session_id, completed } = body;

    if (!session_id) {
      return NextResponse.json(
        { error: "session_id is required" },
        { status: 400 }
      );
    }

    // Verify session belongs to user
    const { data: existingSession, error: fetchError } = await supabase
      .from("pomodoro_sessions")
      .select("id, user_id")
      .eq("id", session_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchError || !existingSession) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    const updateData: { ended_at: string; completed?: boolean } = {
      ended_at: new Date().toISOString(),
    };

    if (typeof completed === "boolean") {
      updateData.completed = completed;
    }

    const { data, error } = await supabase
      .from("pomodoro_sessions")
      .update(updateData)
      .eq("id", session_id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Failed to update pomodoro session:", error);
      return NextResponse.json(
        { error: "Failed to update session" },
        { status: 500 }
      );
    }

    return NextResponse.json({ session: data });
  } catch (error) {
    console.error("Pomodoro update error:", error);
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}

// GET: Fetch user's pomodoro sessions
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "50", 10);

  try {
    const { data, error } = await supabase
      .from("pomodoro_sessions")
      .select(`
        *,
        user_books (
          id,
          title,
          cover,
          authors
        )
      `)
      .eq("user_id", user.id)
      .order("started_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Failed to fetch pomodoro sessions:", error);
      return NextResponse.json(
        { error: "Failed to fetch sessions" },
        { status: 500 }
      );
    }

    return NextResponse.json({ sessions: data });
  } catch (error) {
    console.error("Pomodoro fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}
