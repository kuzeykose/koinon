import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && data.user) {
      // Check if profile exists, if not create one
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", data.user.id)
        .single();

      if (!existingProfile) {
        // Extract name from user metadata or email
        const fullName = data.user.user_metadata?.full_name || 
                        data.user.user_metadata?.name || 
                        data.user.email?.split('@')[0] || 
                        'User';
        
        await supabase
          .from("profiles")
          .insert({
            id: data.user.id,
            full_name: fullName,
            email: data.user.email,
            avatar_url: data.user.user_metadata?.avatar_url || null,
          });
      }
      
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}

// CHECK:
// example url - gotten from outlook email
// https://pjibvrigtmasdlqweszp.supabase.co/auth/v1/verify?token=pkce_8244c8d11e92c0f87e49aeb55357aae722ebab2e59e13b4fb783fe6c&type=signup&redirect_to=http://localhost:3000/auth/callback
