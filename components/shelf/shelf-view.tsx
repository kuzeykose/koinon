"use client";

import { useState, useMemo } from "react";
import { BookCard, UserBook } from "./book-card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Category = "all" | "want-to-read" | "currently-reading" | "read";

interface ShelfViewProps {
  books: UserBook[];
  readOnly?: boolean;
}

const ITEMS_PER_PAGE = 10;

export function ShelfView({ books, readOnly = false }: ShelfViewProps) {
  const [activeCategory, setActiveCategory] = useState<Category>("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Filter books based on category
  const filteredBooks = useMemo(() => {
    let filtered = books;

    switch (activeCategory) {
      case "want-to-read":
        filtered = books.filter((book) => book.status === "WANT_TO_READ");
        break;
      case "currently-reading":
        filtered = books.filter((book) => book.status === "IS_READING");
        break;
      case "read":
        filtered = books.filter((book) => book.status === "COMPLETED");
        break;
      default:
        filtered = books;
    }

    // Sort books by progress percentage (high to low) for currently reading
    // For others, sort by updated_at (most recent first)
    return filtered.slice().sort((a, b) => {
      if (activeCategory === "currently-reading") {
        const progressA = a.capacity ? (a.progress / a.capacity) * 100 : 0;
        const progressB = b.capacity ? (b.progress / b.capacity) * 100 : 0;
        return progressB - progressA;
      }
      return (
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    });
  }, [books, activeCategory]);

  // Pagination
  const totalPages = Math.ceil(filteredBooks.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedBooks = filteredBooks.slice(startIndex, endIndex);

  // Reset to page 1 when category changes
  const handleCategoryChange = (category: Category) => {
    setActiveCategory(category);
    setCurrentPage(1);
  };

  const categories: { value: Category; label: string }[] = [
    { value: "all", label: "All" },
    { value: "want-to-read", label: "Want to Read" },
    { value: "currently-reading", label: "Currently Reading" },
    { value: "read", label: "Read" },
  ];

  return (
    <div className="space-y-6">
      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map((category) => {
          const count = (() => {
            switch (category.value) {
              case "want-to-read":
                return books.filter((b) => b.status === "WANT_TO_READ").length;
              case "currently-reading":
                return books.filter((b) => b.status === "IS_READING").length;
              case "read":
                return books.filter((b) => b.status === "COMPLETED").length;
              default:
                return books.length;
            }
          })();

          return (
            <Button
              key={category.value}
              variant={
                activeCategory === category.value ? "default" : "outline"
              }
              onClick={() => handleCategoryChange(category.value)}
              className="whitespace-nowrap"
            >
              {category.label}
              <span className="ml-2 text-xs opacity-70">({count})</span>
            </Button>
          );
        })}
      </div>

      {/* Books List */}
      <div className="flex flex-col divide-y divide-border">
        {paginatedBooks.length > 0 ? (
          paginatedBooks.map((userBook) => (
            <div key={userBook.id} className="py-3 first:pt-0 last:pb-0">
              <BookCard userBook={userBook} readOnly={readOnly} />
            </div>
          ))
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p>
              {activeCategory === "all"
                ? "No books in your shelf yet. Use the search in the header to add books!"
                : `No books in "${
                    categories.find((c) => c.value === activeCategory)?.label
                  }" category.`}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
              // Show first page, last page, current page, and pages around current
              const showPage =
                page === 1 ||
                page === totalPages ||
                (page >= currentPage - 1 && page <= currentPage + 1);

              if (!showPage && page === currentPage - 2) {
                return (
                  <span key={page} className="px-2 text-muted-foreground">
                    ...
                  </span>
                );
              }

              if (!showPage && page === currentPage + 2) {
                return (
                  <span key={page} className="px-2 text-muted-foreground">
                    ...
                  </span>
                );
              }

              if (!showPage) {
                return null;
              }

              return (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className="w-10"
                >
                  {page}
                </Button>
              );
            })}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Results info */}
      {filteredBooks.length > 0 && (
        <div className="text-center text-sm text-muted-foreground">
          Showing {startIndex + 1}-{Math.min(endIndex, filteredBooks.length)} of{" "}
          {filteredBooks.length} books
        </div>
      )}
    </div>
  );
}
