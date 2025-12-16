"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  ArrowLeft,
  Plus,
  Loader2,
  Check,
  Calendar,
  Building2,
  BookText,
  BookCopy,
} from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { addBookToShelf, BookSearchResult } from "@/lib/actions/book-actions";
import { toast } from "sonner";
import type { BookDetails } from "@/app/api/books/[id]/route";

const readingStatuses: Record<string, string> = {
  IS_READING: "Reading",
  COMPLETED: "Completed",
  PAUSED: "Paused",
  ABANDONED: "Abandoned",
  WANT_TO_READ: "Want to Read",
};

export default function BookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [book, setBook] = useState<BookDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bookId = params.id as string;

  useEffect(() => {
    async function fetchBook() {
      try {
        const response = await fetch(`/api/books/${bookId}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError("Book not found");
          } else {
            setError("Failed to load book details");
          }
          return;
        }
        const data = await response.json();
        setBook(data.book);
      } catch (err) {
        console.error("Error fetching book:", err);
        setError("Failed to load book details");
      } finally {
        setIsLoading(false);
      }
    }

    if (bookId) {
      fetchBook();
    }
  }, [bookId]);

  const handleAddToShelf = async () => {
    if (!book) return;

    setIsAdding(true);
    try {
      const bookData: BookSearchResult = {
        id: book.id,
        isbn13: book.isbn13,
        isbn10: book.isbn10,
        openLibraryKey: book.openLibraryKey,
        title: book.title,
        subtitle: book.subtitle,
        authors: book.authors,
        cover: book.cover,
        published_date: book.published_date,
        publisher: book.publisher,
        page_count: book.page_count,
        description: book.description,
        source: book.source,
      };

      const result = await addBookToShelf(bookData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`"${book.title}" added to your shelf!`);
        // Refresh to show updated state
        router.refresh();
        // Update local state to reflect the change
        setBook((prev) =>
          prev
            ? {
                ...prev,
                userBook: { status: "IS_READING", progress: 0 },
              }
            : null
        );
      }
    } catch (err) {
      toast.error("Failed to add book to shelf");
    } finally {
      setIsAdding(false);
    }
  };

  const getAuthors = () => {
    if (!book?.authors || book.authors.length === 0) return null;
    return book.authors.map((a) => a.name).join(", ");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">{error || "Book not found"}</p>
        </div>
      </div>
    );
  }

  const authors = getAuthors();
  const isInShelf = !!book.userBook;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" size="sm" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      {/* Book Header */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Cover */}
        <div className="flex-shrink-0">
          <div className="w-40 h-56 bg-muted rounded-lg overflow-hidden shadow-md mx-auto md:mx-0">
            {book.cover ? (
              <img
                src={book.cover}
                alt={book.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BookOpen className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
          </div>
        </div>

        {/* Book Info */}
        <div className="flex-1 space-y-4">
          <div>
            <h1 className="text-2xl font-bold">{book.title}</h1>
            {book.subtitle && (
              <p className="text-lg text-muted-foreground mt-1">
                {book.subtitle}
              </p>
            )}
            {authors && (
              <p className="text-md text-muted-foreground mt-2">by {authors}</p>
            )}
          </div>

          {/* Metadata */}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {book.published_date && (
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{book.published_date}</span>
              </div>
            )}
            {book.publisher && (
              <div className="flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                <span>{book.publisher}</span>
              </div>
            )}
            {book.page_count && (
              <div className="flex items-center gap-1">
                <BookText className="h-4 w-4" />
                <span>{book.page_count} pages</span>
              </div>
            )}
          </div>

          {/* Source Badge */}
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {book.source === "database" ? "In Library" : "Open Library"}
            </Badge>
            {book.isbn13 && (
              <Badge variant="secondary" className="text-xs">
                ISBN: {book.isbn13}
              </Badge>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-2">
            {isInShelf ? (
              <div className="flex items-center gap-2">
                <Button disabled variant="secondary">
                  <Check className="h-4 w-4 mr-2" />
                  In Your Shelf
                </Button>
                {book.userBook?.status && (
                  <Badge>
                    {readingStatuses[book.userBook.status] ||
                      book.userBook.status}
                  </Badge>
                )}
              </div>
            ) : (
              <Button onClick={handleAddToShelf} disabled={isAdding}>
                {isAdding ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Add to Shelf
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {book.description && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Description</h2>
          <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
            {book.description}
          </p>
        </div>
      )}

      {/* Editions */}
      {book.editions && book.editions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <BookCopy className="h-5 w-5" />
            <h2 className="text-lg font-semibold">
              Editions ({book.editions.length})
            </h2>
          </div>
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-4 pb-4">
              {book.editions.map((edition, index) => (
                <div
                  key={edition.key || index}
                  className="flex-shrink-0 w-36 space-y-2"
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
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      )}

      {/* Subjects/Categories */}
      {book.subjects && book.subjects.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Subjects</h2>
          <div className="flex flex-wrap gap-2">
            {book.subjects.map((subject, index) => (
              <Badge key={index} variant="secondary">
                {subject}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
