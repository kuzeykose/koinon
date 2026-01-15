"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { BookOpen, MoreVertical, Trash2 } from "lucide-react";
import {
  updateUserBook,
  removeBookFromShelf,
  ReadingStatus,
} from "@/lib/actions/book-actions";

const readingStatuses = {
  WANT_TO_READ: "Want to Read",
  IS_READING: "Reading",
  COMPLETED: "Completed",
  PAUSED: "Paused",
  ABANDONED: "Abandoned",
};

export interface UserBook {
  id: string;
  user_id: string;

  // Book identifier
  book_key?: string | null;
  isbn13?: string | null; // ISBN-13 for source-agnostic identification
  isbn10?: string | null; // ISBN-10 for older books

  // Book metadata
  title: string;
  cover?: string | null;

  // Authors
  authors?: string | null; // JSON string

  // Publication details
  published_date?: string | null;
  page_count?: number | null;
  language?: string | null;

  // Reading status
  status: ReadingStatus;
  progress: number;
  capacity?: number;
  unit?: string;
  completed?: boolean;

  created_at: string;
  updated_at: string;
}

interface BookCardProps {
  userBook: UserBook;
  readOnly?: boolean;
}

export function BookCard({ userBook, readOnly = false }: BookCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [status, setStatus] = useState<ReadingStatus>(userBook.status);
  const [progress, setProgress] = useState(userBook.progress || 0);
  const [capacity, setCapacity] = useState(userBook.capacity || 0);
  const [unit, setUnit] = useState(userBook.unit || "pages");

  const displayStatus =
    readingStatuses[userBook.status as keyof typeof readingStatuses] ||
    "Unknown";
  const displayProgress = userBook.capacity
    ? `${userBook.progress}/${userBook.capacity} ${userBook.unit || "pages"}`
    : null;

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const result = await updateUserBook({
        id: userBook.id,
        status,
        progress,
        capacity: capacity || undefined,
        unit: unit || undefined,
      });

      if (result.error) {
        console.error("Failed to update book:", result.error);
      } else {
        setIsOpen(false);
      }
    } catch (error) {
      console.error("Failed to update book:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await removeBookFromShelf(userBook.id);

      if (result.error) {
        console.error("Failed to remove book:", result.error);
      } else {
        setShowDeleteDialog(false);
        setIsOpen(false);
      }
    } catch (error) {
      console.error("Failed to remove book:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const authors = userBook.authors
    ? JSON.parse(userBook.authors)
        .map((a: { name: string }) => a.name)
        .join(", ")
    : null;

  const progressPercent = userBook.capacity
    ? Math.min((userBook.progress / userBook.capacity) * 100, 100)
    : 0;

  return (
    <div className="flex gap-4 items-center">
      <div className="flex-shrink-0 w-12 h-16 bg-muted rounded overflow-hidden">
        {userBook.cover ? (
          <img
            src={userBook.cover}
            alt={userBook.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-sm truncate">{userBook.title}</h4>
            {/* Status badge for mobile - next to title */}
            {displayStatus !== "Unknown" && (
              <Badge
                variant="secondary"
                className="text-xs whitespace-nowrap md:hidden flex-shrink-0"
              >
                {displayStatus}
              </Badge>
            )}
          </div>
          {authors && (
            <p className="text-xs text-muted-foreground truncate">{authors}</p>
          )}
          {/* Progress bar for mobile - under author */}
          {progressPercent > 0 && (
            <div className="flex md:hidden items-center gap-2 mt-1">
              <div className="flex-1 bg-muted rounded-full h-2">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground text-right whitespace-nowrap">
                {displayProgress || `${Math.round(progressPercent)}%`}
              </span>
            </div>
          )}
        </div>

        {/* Progress bar for desktop - on the right */}
        {progressPercent > 0 && (
          <div className="hidden md:flex items-center gap-2 w-32">
            <div className="flex-1 bg-muted rounded-full h-2">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground w-10 text-right">
              {Math.round(progressPercent)}%
            </span>
          </div>
        )}

        {/* Badges for desktop */}
        <div className="hidden md:flex items-center gap-2">
          {displayStatus !== "Unknown" && (
            <Badge variant="secondary" className="text-xs whitespace-nowrap">
              {displayStatus}
            </Badge>
          )}
          {displayProgress && (
            <Badge variant="outline" className="text-xs whitespace-nowrap">
              {displayProgress}
            </Badge>
          )}
        </div>
      </div>

      {!readOnly && (
        <>
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0 h-8 w-8"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Update Reading Progress</SheetTitle>
                <SheetDescription>
                  Update your reading status and progress for &quot;
                  {userBook.title}
                  &quot;
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-4 px-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select
                    value={status}
                    onValueChange={(value) => setStatus(value as ReadingStatus)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WANT_TO_READ">Want to Read</SelectItem>
                      <SelectItem value="IS_READING">Reading</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="PAUSED">Paused</SelectItem>
                      <SelectItem value="ABANDONED">Abandoned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Progress</label>
                  <div className="flex flex-wrap gap-2 items-center">
                    <Input
                      type="number"
                      value={progress || ""}
                      onChange={(e) => {
                        const value =
                          e.target.value === "" ? 0 : Number(e.target.value);
                        // Don't allow progress to exceed capacity
                        if (capacity > 0 && value > capacity) {
                          setProgress(capacity);
                        } else {
                          setProgress(value);
                        }
                      }}
                      min={0}
                      max={capacity || undefined}
                      className="w-24"
                    />
                    <span className="text-muted-foreground">/</span>
                    <Input
                      type="number"
                      value={capacity || ""}
                      onChange={(e) => {
                        const value =
                          e.target.value === "" ? 0 : Number(e.target.value);
                        setCapacity(value);
                        // If new capacity is less than current progress, adjust progress
                        if (value > 0 && progress > value) {
                          setProgress(value);
                        }
                      }}
                      min={0}
                      className="w-24"
                      placeholder="Total"
                    />
                    <Select value={unit} onValueChange={setUnit}>
                      <SelectTrigger className="w-28">
                        <SelectValue placeholder="Unit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pages">pages</SelectItem>
                        <SelectItem value="chapters">chapters</SelectItem>
                        <SelectItem value="%">%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {capacity > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Progress: {Math.round((progress / capacity) * 100)}%
                    </label>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-emerald-500 h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.min(
                            (progress / capacity) * 100,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <SheetFooter className="flex-col gap-3 sm:flex-col">
                <div className="flex gap-2 w-full">
                  <Button
                    variant="outline"
                    onClick={() => setIsOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    {isLoading ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={isLoading || isDeleting}
                  className="w-full"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove from Shelf
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>

          <AlertDialog
            open={showDeleteDialog}
            onOpenChange={setShowDeleteDialog}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove book from shelf?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to remove &quot;{userBook.title}&quot;
                  from your shelf? This action cannot be undone and will delete
                  all progress data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? "Removing..." : "Remove"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}
