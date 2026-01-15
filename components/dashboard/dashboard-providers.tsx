"use client";

import { PresenceProvider } from "@/contexts/presence-context";

export function DashboardProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PresenceProvider>{children}</PresenceProvider>;
}
