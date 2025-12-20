"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, BookOpen, Loader2, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { BookSearchResult } from "@/lib/actions/book-actions";
import { cn } from "@/lib/utils";

export function BookSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search using API route
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/books/search?q=${encodeURIComponent(query)}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error("Search failed");
        }

        const data = await response.json();
        setResults(data.results || []);
        setIsOpen((data.results || []).length > 0);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Search error:", error);
          setResults([]);
        }
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleViewBook = (book: BookSearchResult) => {
    console.log("book", JSON.stringify(book, null, 2));
    // Determine the best identifier for the book
    // Priority: database ID > ISBN13 > Open Library key
    let bookIdentifier: string = "";
    if (book.source === "database") {
      bookIdentifier = book.id as string;
    } else if (book.source === "openlibrary") {
      bookIdentifier = book.openLibraryKey as string;
    }

    // Close the dropdown and clear query
    setQuery("");
    setResults([]);
    setIsOpen(false);

    // Navigate to the book detail page
    router.push(`/dashboard/book/${encodeURIComponent(bookIdentifier)}`);
  };

  const getAuthors = (authors: { name: string }[]) => {
    if (!authors || authors.length === 0) return null;
    return authors.map((a) => a.name).join(", ");
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative w-64 focus-within:w-96 transition-all duration-300 ease-in-out">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search for books to add..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          className="pl-9 pr-9"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-[400px] overflow-auto rounded-md border bg-popover p-1 shadow-lg">
          {results.map((book, index) => {
            const bookKey =
              book.isbn13 || book.openLibraryKey || `${book.title}-${index}`;
            const authors = getAuthors(book.authors);

            return (
              <div
                key={bookKey}
                className={cn(
                  "flex items-center gap-3 rounded-sm p-2 hover:bg-accent cursor-pointer transition-colors"
                )}
                onClick={() => handleViewBook(book)}
              >
                {/* Book Cover */}
                <div className="flex-shrink-0 w-10 h-14 bg-muted rounded overflow-hidden">
                  {book.cover ? (
                    <img
                      src={book.cover}
                      alt={book.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Book Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-sm truncate">
                      {book.title}
                    </h4>
                    {book.source === "database" && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                        In Library
                      </span>
                    )}
                  </div>
                  {authors && (
                    <p className="text-xs text-muted-foreground truncate">
                      {authors}
                    </p>
                  )}
                  {book.published_date && (
                    <p className="text-xs text-muted-foreground">
                      {book.published_date}
                    </p>
                  )}
                </div>

                {/* View Details Arrow */}
                <ChevronRight className="flex-shrink-0 h-4 w-4 text-muted-foreground" />
              </div>
            );
          })}
        </div>
      )}

      {/* No results message */}
      {isOpen && query.length >= 2 && !isLoading && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border bg-popover p-4 shadow-lg">
          <p className="text-sm text-muted-foreground text-center">
            No books found for &quot;{query}&quot;
          </p>
        </div>
      )}
    </div>
  );
}
