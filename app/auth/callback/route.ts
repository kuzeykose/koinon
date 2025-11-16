import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}

// CHECK:
// example url - gotten from outlook email
// https://pjibvrigtmasdlqweszp.supabase.co/auth/v1/verify?token=pkce_8244c8d11e92c0f87e49aeb55357aae722ebab2e59e13b4fb783fe6c&type=signup&redirect_to=http://localhost:3000/auth/callback
