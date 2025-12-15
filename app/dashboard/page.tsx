import { Library, Users, Settings } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome to Koinon</h1>
        <p className="text-muted-foreground mt-2">
          Manage your reading collection and connect with communities.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/dashboard/shelf"
          className="group rounded-lg border border-border bg-card p-6 transition-all hover:border-border/80 hover:shadow-md"
        >
          <Library className="h-8 w-8 text-muted-foreground group-hover:text-foreground" />
          <h2 className="mt-4 text-lg font-semibold">Shelf</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            View and manage your book collection
          </p>
        </Link>

        <Link
          href="/dashboard/communities"
          className="group rounded-lg border border-border bg-card p-6 transition-all hover:border-border/80 hover:shadow-md"
        >
          <Users className="h-8 w-8 text-muted-foreground group-hover:text-foreground" />
          <h2 className="mt-4 text-lg font-semibold">Communities</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Join reading groups and share progress
          </p>
        </Link>

        <Link
          href="/dashboard/settings"
          className="group rounded-lg border border-border bg-card p-6 transition-all hover:border-border/80 hover:shadow-md"
        >
          <Settings className="h-8 w-8 text-muted-foreground group-hover:text-foreground" />
          <h2 className="mt-4 text-lg font-semibold">Settings</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your account and sync data
          </p>
        </Link>
      </div>
    </div>
  );
}
