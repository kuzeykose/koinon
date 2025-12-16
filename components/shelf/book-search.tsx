"use client";

import { useState, useEffect, useRef } from "react";
import { Search, BookOpen, Loader2, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { addBookToShelf, BookSearchResult } from "@/lib/actions/book-actions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function BookSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [addingBookId, setAddingBookId] = useState<string | null>(null);
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

  const handleAddBook = async (book: BookSearchResult) => {
    console.log("Adding book:", book);
    const bookKey = book.isbn13 || book.title;
    setAddingBookId(bookKey);

    // try {
    //   const result = await addBookToShelf(book);
    //   if (result.error) {
    //     toast.error(result.error);
    //   } else {
    //     toast.success(`"${book.title}" added to your shelf!`);
    //     setQuery("");
    //     setResults([]);
    //     setIsOpen(false);
    //   }
    // } catch (error) {
    //   toast.error("Failed to add book");
    // } finally {
    //   setAddingBookId(null);
    // }
  };

  const getAuthors = (authors: { name: string }[]) => {
    if (!authors || authors.length === 0) return null;
    return authors.map((a) => a.name).join(", ");
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
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
            const bookKey = book.isbn13 || `${book.title}-${index}`;
            const isAdding = addingBookId === (book.isbn13 || book.title);
            const authors = getAuthors(book.authors);

            return (
              <div
                key={bookKey}
                className={cn(
                  "flex items-center gap-3 rounded-sm p-2 hover:bg-accent cursor-pointer transition-colors",
                  isAdding && "opacity-50 pointer-events-none"
                )}
                onClick={() => handleAddBook(book)}
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

                {/* Add Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="flex-shrink-0 h-8 w-8"
                  disabled={isAdding}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddBook(book);
                  }}
                >
                  {isAdding ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
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
