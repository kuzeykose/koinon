"use client";

import { useState, useCallback, ReactNode } from "react";
import { useSearchParams } from "next/navigation";
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
  const searchParams = useSearchParams();
  
  // Get initial tab from URL for refresh persistence
  const tabParam = searchParams.get("tab");
  const initialTab: TabValue = VALID_TABS.includes(tabParam as TabValue) 
    ? (tabParam as TabValue) 
    : "feed";

  const [currentTab, setCurrentTab] = useState<TabValue>(initialTab);

  const handleTabChange = useCallback((value: string) => {
    const newTab = value as TabValue;
    setCurrentTab(newTab);
    
    // Update URL without triggering navigation (for refresh persistence)
    const params = new URLSearchParams(searchParams.toString());
    
    if (newTab === "feed") {
      params.delete("tab");
      params.delete("page");
    } else {
      params.set("tab", newTab);
      params.delete("page");
    }
    
    const queryString = params.toString();
    const newUrl = queryString 
      ? `${window.location.pathname}?${queryString}` 
      : window.location.pathname;
    
    window.history.replaceState(null, "", newUrl);
  }, [searchParams]);

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
