"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Loader2, BookCopy } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { BookEdition, EditionsResponse } from "@/app/api/editions/route";

interface BookEditionsProps {
  workKey: string | null | undefined;
}

export function BookEditions({ workKey }: BookEditionsProps) {
  const router = useRouter();
  const [editions, setEditions] = useState<BookEdition[]>([]);
  const [editionsPagination, setEditionsPagination] = useState<
    EditionsResponse["pagination"] | null
  >(null);
  const [isLoadingEditions, setIsLoadingEditions] = useState(false);

  useEffect(() => {
    if (workKey) {
      fetchEditions(workKey, 1);
    }
  }, [workKey]);

  const fetchEditions = async (key: string, page: number) => {
    setIsLoadingEditions(true);
    try {
      console.log(`Fetching editions for work key: ${key}, page: ${page}`);
      const response = await fetch(
        `/api/editions?workKey=${key}&page=${page}&limit=20`
      );

      if (response.ok) {
        const data: EditionsResponse = await response.json();
        console.log(
          `Fetched ${data.editions.length} editions, total: ${data.pagination.total}`
        );
        if (page === 1) {
          setEditions(data.editions);
        } else {
          setEditions((prev) => [...prev, ...data.editions]);
        }
        setEditionsPagination(data.pagination);
      } else {
        const errorData = await response.json();
        console.error("Failed to fetch editions:", errorData);
      }
    } catch (err) {
      console.error("Error fetching editions:", err);
    } finally {
      setIsLoadingEditions(false);
    }
  };

  const loadMoreEditions = () => {
    if (editionsPagination && editionsPagination.hasMore && workKey) {
      fetchEditions(workKey, editionsPagination.page + 1);
    }
  };

  // Don't render anything if no work key or no editions
  if (!workKey || editions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <BookCopy className="h-5 w-5" />
        <h2 className="text-lg font-semibold">
          Editions {editionsPagination && `(${editionsPagination.total})`}
        </h2>
      </div>
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-4 pb-4">
          {editions.map((edition, index) => (
            <div
              key={edition.key || index}
              className="flex-shrink-0 w-36 space-y-2 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => router.push(`/dashboard/book/${edition.key}`)}
            >
              {/* Edition Cover */}
              <div className="w-full h-48 bg-muted rounded-md overflow-hidden">
                {edition.cover ? (
                  <img
                    src={edition.cover}
                    alt={edition.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Edition Info */}
              <div className="space-y-1">
                {edition.format && (
                  <Badge variant="outline" className="text-[10px]">
                    {edition.format}
                  </Badge>
                )}
                {edition.publisher && (
                  <p className="text-xs text-muted-foreground truncate">
                    {edition.publisher}
                  </p>
                )}
                {edition.publish_date && (
                  <p className="text-xs text-muted-foreground">
                    {edition.publish_date}
                  </p>
                )}
                {edition.page_count && (
                  <p className="text-xs text-muted-foreground">
                    {edition.page_count} pages
                  </p>
                )}
                {edition.language && (
                  <Badge variant="secondary" className="text-[10px]">
                    {edition.language.toUpperCase()}
                  </Badge>
                )}
              </div>
            </div>
          ))}

          {/* Load More Button */}
          {editionsPagination?.hasMore && (
            <div className="flex-shrink-0 w-36 h-48 flex items-center justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  loadMoreEditions();
                }}
                disabled={isLoadingEditions}
              >
                {isLoadingEditions ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Load More"
                )}
              </Button>
            </div>
          )}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
