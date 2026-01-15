import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardProviders } from "@/components/dashboard/dashboard-providers";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <DashboardProviders>
      <div className="min-h-screen bg-background">
        <DashboardHeader
          userEmail={user.email}
          avatarUrl={user.user_metadata?.picture}
        />
        <main className="container mx-auto px-4 py-8">{children}</main>
      </div>
    </DashboardProviders>
  );
}
