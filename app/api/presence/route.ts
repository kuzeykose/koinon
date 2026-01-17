import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// POST endpoint for updating presence status
// This endpoint is designed to work with navigator.sendBeacon for reliable
// delivery during page unload (browser/tab close)
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
    const { status } = body;

    // Validate status
    if (!status || !["online", "reading", "offline"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be 'online', 'reading', or 'offline'" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const { error } = await supabase
      .from("profiles")
      .update({
        status,
        last_seen: now,
      })
      .eq("id", user.id);

    if (error) {
      console.error("Failed to update presence:", error);
      return NextResponse.json(
        { error: "Failed to update presence" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, status, last_seen: now });
  } catch (error) {
    console.error("Presence update error:", error);
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
