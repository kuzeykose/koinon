"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const VALID_TABS = ["feed", "members", "information"] as const;
type TabValue = (typeof VALID_TABS)[number];

interface CommunityTabsProps {
  feedContent: ReactNode;
  membersContent: ReactNode;
  informationContent: ReactNode;
}

export function CommunityTabs({ 
  feedContent, 
  membersContent, 
  informationContent 
}: CommunityTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get the current tab from URL, default to "feed"
  const tabParam = searchParams.get("tab");
  const currentTab: TabValue = VALID_TABS.includes(tabParam as TabValue) 
    ? (tabParam as TabValue) 
    : "feed";

  const handleTabChange = useCallback((value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (value === "feed") {
      // Remove tab param for default tab to keep URL clean
      params.delete("tab");
    } else {
      params.set("tab", value);
    }
    
    // Preserve page param only for feed tab
    if (value !== "feed") {
      params.delete("page");
    }
    
    const queryString = params.toString();
    router.push(queryString ? `?${queryString}` : window.location.pathname, { scroll: false });
  }, [router, searchParams]);

  return (
    <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
      <TabsList>
        <TabsTrigger value="feed">Community Feed</TabsTrigger>
        <TabsTrigger value="members">Members</TabsTrigger>
        <TabsTrigger value="information">Information</TabsTrigger>
      </TabsList>

      <TabsContent value="feed" className="mt-6">
        {feedContent}
      </TabsContent>

      <TabsContent value="members" className="mt-6">
        {membersContent}
      </TabsContent>

      <TabsContent value="information" className="mt-6">
        {informationContent}
      </TabsContent>
    </Tabs>
  );
}
