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
          className="group rounded-lg border border-zinc-200 bg-white p-6 transition-all hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
        >
          <Library className="h-8 w-8 text-zinc-600 group-hover:text-zinc-900 dark:text-zinc-400 dark:group-hover:text-zinc-100" />
          <h2 className="mt-4 text-lg font-semibold">Shelf</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            View and manage your book collection
          </p>
        </Link>

        <Link
          href="/dashboard/communities"
          className="group rounded-lg border border-zinc-200 bg-white p-6 transition-all hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
        >
          <Users className="h-8 w-8 text-zinc-600 group-hover:text-zinc-900 dark:text-zinc-400 dark:group-hover:text-zinc-100" />
          <h2 className="mt-4 text-lg font-semibold">Communities</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Join reading groups and share progress
          </p>
        </Link>

        <Link
          href="/dashboard/settings"
          className="group rounded-lg border border-zinc-200 bg-white p-6 transition-all hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
        >
          <Settings className="h-8 w-8 text-zinc-600 group-hover:text-zinc-900 dark:text-zinc-400 dark:group-hover:text-zinc-100" />
          <h2 className="mt-4 text-lg font-semibold">Settings</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Manage your account and sync data
          </p>
        </Link>
      </div>
    </div>
  );
}
