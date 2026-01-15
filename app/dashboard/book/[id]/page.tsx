"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  ArrowLeft,
  Loader2,
  Calendar,
  Building2,
  BookText,
  Edit,
} from "lucide-react";
import {
  addBookToShelf,
  updateBookStatus,
  removeBookByKey,
  ReadingStatus,
} from "@/lib/actions/book-actions";
import { toast } from "sonner";
import { BookEditions } from "@/components/book/book-editions";
import { AddBookDialog } from "@/components/shelf/add-book-dialog";

interface WorkDetails {
  workKey: string;
  title: string;
  subtitle?: string | null;
  authors: { name: string }[];
  cover?: string | null;
  description?: string | null;
  subjects?: string[];
  firstPublishYear?: number | null;
  source: "openlibrary";
}

interface BookEditionDetails {
  isbn13: string | null;
  isbn10?: string | null;
  openLibraryKey: string;
  workKey: string | null;
  title: string;
  subtitle?: string | null;
  authors: { name: string }[];
  cover?: string | null;
  publishDate?: string | null;
  publisher?: string | null;
  pageCount?: number | null;
  description?: string | null;
  subjects?: string[];
  format?: string | null;
  language?: string | null;
  source: "database" | "openlibrary";
}

type BookDetails = WorkDetails | BookEditionDetails;

const readingStatuses: Record<string, string> = {
  IS_READING: "Reading",
  COMPLETED: "Completed",
  PAUSED: "Paused",
  ABANDONED: "Abandoned",
  WANT_TO_READ: "Want to Read",
};

function isWork(details: BookDetails): details is WorkDetails {
  return "workKey" in details && !("openLibraryKey" in details);
}

function isEdition(details: BookDetails): details is BookEditionDetails {
  return "openLibraryKey" in details && details.openLibraryKey.includes("M");
}

export default function BookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [bookDetails, setBookDetails] = useState<BookDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inUserShelf, setInUserShelf] = useState(false);
  const [userBookStatus, setUserBookStatus] = useState<ReadingStatus | null>(
    null
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const id = params.id as string;

  useEffect(() => {
    async function fetchDetails() {
      try {
        // Determine if it's a work key (contains 'W') or edition key (contains 'M')
        const isWorkKey = id.includes("W");
        const endpoint = isWorkKey ? `/api/works/${id}` : `/api/books/${id}`;

        const response = await fetch(endpoint);
        if (!response.ok) {
          if (response.status === 404) {
            setError("Book not found");
          } else {
            setError("Failed to load book details");
          }
          return;
        }
        const data = await response.json();
        setBookDetails(data.work || data.book);
        setInUserShelf(data.inUserShelf || false);
        setUserBookStatus(data.userBookStatus || null);
      } catch (err) {
        console.error("Error fetching book details:", err);
        setError("Failed to load book details");
      } finally {
        setIsLoading(false);
      }
    }

    if (id) {
      fetchDetails();
    }
  }, [id]);

  const handleAddToShelf = () => {
    setIsDialogOpen(true);
  };

  const handleConfirmAdd = async (status: ReadingStatus) => {
    if (!bookDetails) return;

    const isWorkView = isWork(bookDetails);
    const isEditionView = isEdition(bookDetails);

    // Use the appropriate key - work key for works, edition key for editions
    let bookKey: string | undefined;

    if (isWorkView) {
      bookKey = bookDetails.workKey;
    } else if (isEditionView) {
      bookKey = bookDetails.openLibraryKey;
    }

    setIsAdding(true);
    try {
      let result;

      if (inUserShelf && bookKey) {
        // Update existing book status
        result = await updateBookStatus(bookKey, status);
        if (!result.error) {
          toast.success(`Status updated to "${readingStatuses[status]}"!`);
        }
      } else {
        // Add new book to shelf
        const bookData = {
          bookKey,
          isbn13: isEditionView ? bookDetails.isbn13 : undefined,
          isbn10: isEditionView ? bookDetails.isbn10 : undefined,
          title: bookDetails.title,
          authors: bookDetails.authors,
          cover: bookDetails.cover,
          published_date: isEditionView ? bookDetails.publishDate : undefined,
          page_count: isEditionView ? bookDetails.pageCount : undefined,
          language: isEditionView ? bookDetails.language : undefined,
          source: bookDetails.source,
        };

        result = await addBookToShelf(bookData, status);
        if (!result.error) {
          toast.success(`"${bookDetails.title}" added to your shelf!`);
          setInUserShelf(true);
        }
      }

      if (result.error) {
        toast.error(result.error);
      } else {
        setUserBookStatus(status);
        setIsDialogOpen(false);
        router.refresh();
      }
    } catch (err) {
      toast.error(
        inUserShelf
          ? "Failed to update book status"
          : "Failed to add book to shelf"
      );
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveBook = async () => {
    if (!bookDetails) return;

    const isWorkView = isWork(bookDetails);
    const isEditionView = isEdition(bookDetails);

    // Use the appropriate key - work key for works, edition key for editions
    let bookKey: string | undefined;

    if (isWorkView) {
      bookKey = bookDetails.workKey;
    } else if (isEditionView) {
      bookKey = bookDetails.openLibraryKey;
    }

    if (!bookKey) {
      toast.error("Unable to remove book: no book identifier found");
      return;
    }

    try {
      const result = await removeBookByKey(bookKey);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`"${bookDetails.title}" removed from your shelf!`);
        setInUserShelf(false);
        setUserBookStatus(null);
        setIsDialogOpen(false);
        router.refresh();
      }
    } catch (err) {
      toast.error("Failed to remove book from shelf");
    }
  };

  const getAuthors = () => {
    if (!bookDetails?.authors || bookDetails.authors.length === 0) return null;
    return bookDetails.authors.map((a) => a.name).join(", ");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !bookDetails) {
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
  const isWorkView = isWork(bookDetails);
  const isEditionView = isEdition(bookDetails);

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
            {bookDetails.cover ? (
              <img
                src={bookDetails.cover}
                alt={bookDetails.title}
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
            <h1 className="text-2xl font-bold">{bookDetails.title}</h1>
            {bookDetails.subtitle && (
              <p className="text-lg text-muted-foreground mt-1">
                {bookDetails.subtitle}
              </p>
            )}
            {authors && (
              <p className="text-md text-muted-foreground mt-2">by {authors}</p>
            )}
          </div>

          {/* Metadata */}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {isWorkView && bookDetails.firstPublishYear && (
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>First published {bookDetails.firstPublishYear}</span>
              </div>
            )}
            {isEditionView && bookDetails.publishDate && (
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{bookDetails.publishDate}</span>
              </div>
            )}
            {isEditionView && bookDetails.publisher && (
              <div className="flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                <span>{bookDetails.publisher}</span>
              </div>
            )}
            {isEditionView && bookDetails.pageCount && (
              <div className="flex items-center gap-1">
                <BookText className="h-4 w-4" />
                <span>{bookDetails.pageCount} pages</span>
              </div>
            )}
            {isEditionView && bookDetails.isbn13 && (
              <div className="flex items-center gap-1">
                <BookOpen className="h-4 w-4" />
                <span>ISBN-13: {bookDetails.isbn13}</span>
              </div>
            )}
            {isEditionView && bookDetails.isbn10 && !bookDetails.isbn13 && (
              <div className="flex items-center gap-1">
                <BookOpen className="h-4 w-4" />
                <span>ISBN-10: {bookDetails.isbn10}</span>
              </div>
            )}
          </div>

          {/* Action Button */}
          <div className="pt-2">
            {inUserShelf && userBookStatus ? (
              <Button
                onClick={handleAddToShelf}
                disabled={isAdding}
                variant="outline"
              >
                {userBookStatus === "WANT_TO_READ" && <>Want to Read</>}
                {userBookStatus === "IS_READING" && <>Currently Reading</>}
                {userBookStatus === "COMPLETED" && <>Read</>}
                {userBookStatus === "PAUSED" && <>Paused</>}
                {userBookStatus === "ABANDONED" && <>Abandoned</>}
                <Edit className="h-3 w-3 ml-2 opacity-50" />
              </Button>
            ) : (
              <Button onClick={handleAddToShelf} disabled={isAdding}>
                Add to Shelf
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Add Book Dialog */}
      <AddBookDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onConfirm={handleConfirmAdd}
        bookTitle={bookDetails.title}
        isLoading={isAdding}
        currentStatus={userBookStatus}
        onRemove={inUserShelf ? handleRemoveBook : undefined}
        showRemoveButton={inUserShelf}
      />

      {/* Description */}
      {bookDetails.description && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Description</h2>
          <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
            {bookDetails.description}
          </p>
        </div>
      )}

      {/* Editions - Show for works or if edition has a work key */}
      {(isWorkView || (isEditionView && bookDetails.workKey)) && (
        <BookEditions
          workKey={
            isWorkView ? bookDetails.workKey : bookDetails.workKey || undefined
          }
        />
      )}

      {/* Subjects/Categories */}
      {bookDetails.subjects && bookDetails.subjects.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Subjects</h2>
          <div className="flex flex-wrap gap-2">
            {bookDetails.subjects.map((subject, index) => (
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
