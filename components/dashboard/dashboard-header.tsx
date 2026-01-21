"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  BookOpen,
  Library,
  Users,
  Moon,
  Sun,
  Monitor,
  Circle,
  CircleOff,
  BarChart3,
  Timer,
} from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BookSearch } from "@/components/shelf/book-search";
import { usePresence } from "@/contexts/presence-context";
import { useAuth } from "@/contexts/auth-context";

interface DashboardHeaderProps {
  userEmail: string | undefined;
  avatarUrl: string | undefined;
}

const navItems = [
  { href: "/dashboard/shelf", label: "Shelf", icon: Library },
  { href: "/dashboard/statistics", label: "Statistics", icon: BarChart3 },
  { href: "/dashboard/communities", label: "Communities", icon: Users },
];

export function DashboardHeader({
  userEmail,
  avatarUrl,
}: DashboardHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const { getUserStatus, setStatus } = usePresence();

  const currentStatus = user ? getUserStatus(user.id) : "offline";
  const isOnline = currentStatus !== "offline";

  const handleStatusChange = async (nextStatus: "online" | "offline") => {
    if (nextStatus === currentStatus) return;
    const didUpdate = await setStatus(nextStatus);
    if (didUpdate) {
      toast.success(
        nextStatus === "online"
          ? "You are now visible"
          : "You are now invisible"
      );
      return;
    }
    toast.error("Failed to update status");
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Signed out successfully");
      router.push("/");
      router.refresh();
    } catch (error) {
      toast.error("Failed to sign out");
    }
  };

  const getInitials = (email: string | undefined) => {
    if (!email) return "U";
    return email.charAt(0).toUpperCase();
  };

  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between gap-4 py-4">
          <Link
            href="/dashboard"
            prefetch={false}
            className="flex items-center space-x-2 flex-shrink-0"
          >
            <BookOpen className="h-6 w-6 text-foreground" />
            <span className="text-xl font-bold text-foreground hidden sm:inline">
              Koinon
              <span className="ml-2 text-xs font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded align-middle">
                beta
              </span>
            </span>
          </Link>

          {/* Book Search and Pomodoro */}
          <div className="flex items-center gap-2">
            <BookSearch />
            <Link
              href="/dashboard/pomodoro"
              prefetch={false}
              className={cn(
                "flex items-center justify-center h-9 w-9 rounded-md transition-colors",
                pathname.startsWith("/dashboard/pomodoro")
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent hover:text-accent-foreground"
              )}
              title="Pomodoro Timer"
            >
              <Timer className="h-5 w-5" />
            </Link>

            <div className="flex items-center gap-2 flex-shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="focus:outline-none">
                    <Avatar className="h-9 w-9 cursor-pointer transition-opacity hover:opacity-80">
                      {avatarUrl && (
                        <AvatarImage
                          src={avatarUrl}
                          alt={userEmail || "User"}
                        />
                      )}
                      <AvatarFallback className="bg-muted text-muted-foreground">
                        {getInitials(userEmail)}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <p className="text-sm font-medium">{userEmail}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => router.push("/dashboard/settings")}
                    className="cursor-pointer"
                  >
                    Settings
                  </DropdownMenuItem>
                  <div className="flex items-center justify-between px-2 py-1.5">
                    <span className="text-sm">Theme</span>
                    <div className="flex items-center rounded-md border bg-muted p-0.5">
                      <button
                        onClick={() => setTheme("system")}
                        className={cn(
                          "rounded-sm p-1.5 transition-colors",
                          theme === "system"
                            ? "bg-background shadow-sm"
                            : "hover:bg-background/50"
                        )}
                      >
                        <Monitor className="h-2.5 w-2.5" />
                      </button>
                      <button
                        onClick={() => setTheme("light")}
                        className={cn(
                          "rounded-sm p-1.5 transition-colors",
                          theme === "light"
                            ? "bg-background shadow-sm"
                            : "hover:bg-background/50"
                        )}
                      >
                        <Sun className="h-2.5 w-2.5" />
                      </button>
                      <button
                        onClick={() => setTheme("dark")}
                        className={cn(
                          "rounded-sm p-1.5 transition-colors",
                          theme === "dark"
                            ? "bg-background shadow-sm"
                            : "hover:bg-background/50"
                        )}
                      >
                        <Moon className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-2 py-1.5">
                    <span className="text-sm">Status</span>
                    <div className="flex items-center rounded-md border bg-muted p-0.5">
                      <button
                        onClick={() => handleStatusChange("online")}
                        className={cn(
                          "rounded-sm p-1.5 transition-colors",
                          isOnline
                            ? "bg-background shadow-sm"
                            : "hover:bg-background/50"
                        )}
                        title="Online"
                      >
                        <Circle
                          className={cn(
                            "h-2.5 w-2.5",
                            isOnline && "fill-green-500 text-green-500"
                          )}
                        />
                      </button>
                      <button
                        onClick={() => handleStatusChange("offline")}
                        className={cn(
                          "rounded-sm p-1.5 transition-colors",
                          !isOnline
                            ? "bg-background shadow-sm"
                            : "hover:bg-background/50"
                        )}
                        title="Offline"
                      >
                        <CircleOff className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
        <nav className="-mb-px flex gap-6">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                prefetch={false}
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition-colors",
                  isActive
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
