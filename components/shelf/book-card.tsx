"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { BookOpen, Pencil } from "lucide-react";
import { updateUserBook, ReadingStatus } from "@/lib/actions/book-actions";

const readingStatuses = {
  IS_READING: "Reading",
  COMPLETED: "Completed",
  PAUSED: "Paused",
  ABANDONED: "Abandoned",
};

interface Book {
  id: string;
  title: string;
  cover?: string;
  authors?: string;
}

export interface UserBook {
  book_id: string;
  status: ReadingStatus;
  progress: number;
  capacity?: number;
  unit?: string;
  completed?: boolean;
}

interface BookCardProps {
  book: Book;
  userBook?: UserBook;
}

export function BookCard({ book, userBook }: BookCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<ReadingStatus>(
    userBook?.status || "IS_READING"
  );
  const [progress, setProgress] = useState(userBook?.progress || 0);
  const [capacity, setCapacity] = useState(userBook?.capacity || 0);
  const [unit, setUnit] = useState(userBook?.unit || "pages");

  const displayStatus =
    readingStatuses[userBook?.status as keyof typeof readingStatuses] ||
    "Unknown";
  const displayProgress = userBook?.capacity
    ? `${userBook.progress}/${userBook.capacity} ${userBook.unit || "pages"}`
    : null;

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const result = await updateUserBook({
        bookId: book.id,
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

  const authors = book.authors
    ? JSON.parse(book.authors)
        .map((a: { name: string }) => a.name)
        .join(", ")
    : null;

  return (
    <div className="flex gap-4 group relative">
      <div className="flex-shrink-0 w-16 h-24 bg-zinc-100 rounded overflow-hidden">
        {book.cover ? (
          <img
            src={book.cover}
            alt={book.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="h-6 w-6 text-zinc-300" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm line-clamp-2 mb-1">{book.title}</h4>
        {authors && <p className="text-xs text-zinc-500 truncate">{authors}</p>}

        <div className="flex flex-wrap gap-1 mt-2">
          <Badge variant="secondary" className="text-xs">
            {displayStatus}
          </Badge>
          {displayProgress && (
            <Badge variant="secondary" className="text-xs">
              {displayProgress}
            </Badge>
          )}
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Reading Progress</DialogTitle>
            <DialogDescription>
              Update your reading status and progress for &quot;{book.title}
              &quot;
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
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
                  <SelectItem value="IS_READING">Reading</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="PAUSED">Paused</SelectItem>
                  <SelectItem value="ABANDONED">Abandoned</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Progress</label>
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  value={progress}
                  onChange={(e) => setProgress(Number(e.target.value))}
                  min={0}
                  max={capacity || undefined}
                  className="w-24"
                />
                <span className="text-zinc-500">/</span>
                <Input
                  type="number"
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
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
                <label className="text-sm font-medium text-zinc-500">
                  Progress: {Math.round((progress / capacity) * 100)}%
                </label>
                <div className="w-full bg-zinc-100 rounded-full h-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min((progress / capacity) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
