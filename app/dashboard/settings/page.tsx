"use client";

import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  LogOut,
  User,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createClient } from "@/lib/supabase/client";

interface ReadingState {
  id: string;
  status: string;
  bookId: string;
  profileId: string;
  createdAt: string;
}

interface ReadingProgress {
  id: string;
  bookId: string;
  capacity: number;
  createdAt: string;
  profileId: string;
  progress: number;
  unit: string;
  completed: boolean;
}

interface Book {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  description?: string;
  isbn10?: string;
  isbn13?: string;
  language?: string;
  pageCount?: number;
  publishedDate?: string;
  publisher?: string;
  cover?: string;
  authors?: Array<{
    id: string;
    name: string;
  }>;
  gradientColors?: string[];
}

interface BookPreview {
  readingState: ReadingState;
  readingProgress: ReadingProgress | null;
  book: Book;
}

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [pendingBooks, setPendingBooks] = useState<BookPreview[]>([]);
  const [syncStatus, setSyncStatus] = useState<{
    books: number;
  } | null>(null);

  const fetchReadingProgresses = async (token: string, bookIds: string[]) => {
    try {
      const response = await fetch("https://literal.club/graphql/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: `
            query readingProgresses($bookIds: [String!]!) {
              readingProgresses(bookIds: $bookIds, active: true) {
                bookId
                capacity
                createdAt
                id
                profileId
                progress
                unit
                completed
              }
            }
          `,
          variables: {
            bookIds,
          },
        }),
      });

      const data = await response.json();

      if (data.errors) {
        console.error("Failed to fetch reading progresses:", data.errors);
        return [];
      }

      return data.data?.readingProgresses || [];
    } catch (error) {
      console.error("Error fetching reading progresses:", error);
      return [];
    }
  };

  const saveToDatabase = async (booksData: BookPreview[]) => {
    if (!user?.id) {
      toast.error("User not authenticated");
      return false;
    }

    const supabase = createClient();

    try {
      // First, save all books to the books table
      const booksToSave = booksData.map((item) => ({
        id: item.book.id,
        slug: item.book.slug,
        title: item.book.title,
        subtitle: item.book.subtitle,
        description: item.book.description,
        isbn10: item.book.isbn10,
        isbn13: item.book.isbn13,
        language: item.book.language,
        page_count: item.book.pageCount,
        published_date: item.book.publishedDate,
        publisher: item.book.publisher,
        cover: item.book.cover,
        authors: item.book.authors ? JSON.stringify(item.book.authors) : null,
        gradient_colors: item.book.gradientColors
          ? JSON.stringify(item.book.gradientColors)
          : null,
        synced_at: new Date().toISOString(),
      }));

      const { error: booksError } = await supabase
        .from("books")
        .upsert(booksToSave, {
          onConflict: "id",
        });

      if (booksError) {
        console.error("Error saving books:", booksError);
        toast.error("Failed to save books to database");
        return false;
      }

      // Save to the merged user_books table
      const userBooksData = booksData.map((item) => ({
        id: item.readingState.id,
        user_id: user.id,
        book_id: item.readingState.bookId,
        profile_id: item.readingState.profileId,
        status: item.readingState.status,
        progress: item.readingProgress?.progress || 0,
        capacity: item.readingProgress?.capacity || null,
        unit: item.readingProgress?.unit || "pages",
        completed: item.readingProgress?.completed || false,
        created_at: item.readingState.createdAt,
        synced_at: new Date().toISOString(),
      }));

      const { error: userBooksError } = await supabase
        .from("user_books")
        .upsert(userBooksData, {
          onConflict: "user_id,book_id",
        });

      if (userBooksError) {
        console.error("Error saving user_books:", userBooksError);
        toast.error("Failed to save reading data to database");
        return false;
      }

      // Save/Update profile
      const literalProfileStr = localStorage.getItem("literal_profile");
      if (literalProfileStr) {
        try {
          const literalProfile = JSON.parse(literalProfileStr);
          const { error: profileError } = await supabase
            .from("profiles")
            .upsert({
              id: user.id,
              full_name: literalProfile.name,
              avatar_url: literalProfile.image,
              updated_at: new Date().toISOString(),
            });

          if (profileError) {
            console.error("Error saving profile:", profileError);
            // Don't fail the whole sync for this, just log it
          }
        } catch (e) {
          console.error("Error parsing literal profile:", e);
        }
      }

      setSyncStatus({
        books: booksData.length,
      });

      toast.success("Successfully saved all data to database!");
      return true;
    } catch (error) {
      console.error("Error saving to database:", error);
      toast.error("Failed to save data to database");
      return false;
    }
  };

  const fetchReadingStates = async (token: string) => {
    setIsSyncing(true);
    try {
      const response = await fetch("https://literal.club/graphql/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: `
            query myReadingStates {
              myReadingStates {
                id
                status
                bookId
                profileId
                createdAt
                book {
                  id
                  slug
                  title
                  subtitle
                  description
                  isbn10
                  isbn13
                  language
                  pageCount
                  publishedDate
                  publisher
                  cover
                  authors {
                    id
                    name
                  }
                  gradientColors
                }
              }
            }
          `,
        }),
      });

      const data = await response.json();

      if (data.errors) {
        toast.error("Failed to fetch reading data");
        console.error(data.errors);
        return;
      }

      if (data.data?.myReadingStates) {
        const readingStates = data.data.myReadingStates;
        console.log("Reading states with books:", readingStates);

        toast.success(
          `Fetched ${readingStates.length} books from Literal.club`
        );

        // Fetch reading progresses for all books in a single call
        toast.info("Fetching reading progress...");

        const bookIds = readingStates.map((state: any) => state.bookId);
        const readingProgresses = await fetchReadingProgresses(token, bookIds);

        console.log("Reading progresses:", readingProgresses);
        // Create a map of bookId to reading progress for easy lookup
        const progressMap = new Map<string, ReadingProgress>(
          readingProgresses
            .filter((progress: ReadingProgress) => progress)
            .map((progress: ReadingProgress) => [progress.bookId, progress])
        );

        // Combine reading states with their book data and progress
        const booksWithDetails: BookPreview[] = readingStates
          .filter((state: any) => state.book) // Only include states with book data
          .map((state: any) => {
            const progress = progressMap.get(state.bookId);
            return {
              readingState: {
                id: state.id,
                status: state.status,
                bookId: state.bookId,
                profileId: state.profileId,
                createdAt: state.createdAt,
              },
              readingProgress: progress !== undefined ? progress : null,
              book: state.book,
            };
          });

        console.log("Books with details:", booksWithDetails);

        // Show approval modal with book details
        setPendingBooks(booksWithDetails);
        setIsApprovalModalOpen(true);
        toast.success("Ready to sync! Please review the books.");
      }
    } catch (error) {
      toast.error("Failed to sync reading data");
      console.error(error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleApproveSync = async () => {
    setIsApproving(true);
    try {
      const success = await saveToDatabase(pendingBooks);
      if (success) {
        setIsApprovalModalOpen(false);
        setPendingBooks([]);
      }
    } catch (error) {
      console.error("Error approving sync:", error);
    } finally {
      setIsApproving(false);
    }
  };

  const handleLiteralLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("https://literal.club/graphql/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `
            mutation login($email: String!, $password: String!) {
              login(email: $email, password: $password) {
                token
                email
                languages
                profile {
                  id
                  handle
                  name
                  bio
                  image
                }
              }
            }
          `,
          variables: {
            email,
            password,
          },
        }),
      });

      const data = await response.json();

      if (data.errors) {
        toast.error(data.errors[0]?.message || "Login failed");
        return;
      }

      if (data.data?.login?.token) {
        const token = data.data.login.token;

        // Store the token in localStorage
        localStorage.setItem("literal_token", token);
        localStorage.setItem(
          "literal_profile",
          JSON.stringify(data.data.login.profile)
        );

        toast.success(
          `Connected to Literal.club as ${
            data.data.login.profile.name || data.data.login.email
          }`
        );

        setIsModalOpen(false);
        setEmail("");
        setPassword("");
      }
    } catch (error) {
      toast.error("Failed to connect to Literal.club");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncFromToken = async () => {
    const token = localStorage.getItem("literal_token");
    if (token) {
      await fetchReadingStates(token);
    } else {
      toast.error("No Literal.club token found. Please connect first.");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            Settings
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Manage your account and sync your reading data
          </p>
        </div>

        {/* Literal.club Integration */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Literal.club Integration</CardTitle>
            <CardDescription>
              Connect your Literal.club account to sync your reading list and
              progress
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => setIsModalOpen(true)}
                className="flex-1"
                variant="default"
              >
                <BookOpen className="mr-2 h-4 w-4" />
                Connect Literal.club
              </Button>
              <Button
                onClick={handleSyncFromToken}
                disabled={isSyncing}
                className="flex-1"
                variant="outline"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Sync Reading Data
                  </>
                )}
              </Button>
            </div>

            {syncStatus && (
              <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-start">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mr-3 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-900 dark:text-green-100">
                      Last sync completed successfully
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                      Synced {syncStatus.books} books with reading status and
                      progress
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              <p>
                <strong>Note:</strong> Syncing your data will fetch all your
                reading states and progress from Literal.club and save them to
                your Koinon account.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your Koinon account details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <Label className="text-sm text-zinc-600 dark:text-zinc-400">
                  Email
                </Label>
                <p className="text-zinc-900 dark:text-zinc-100">
                  {user?.email}
                </p>
              </div>
              <div>
                <Label className="text-sm text-zinc-600 dark:text-zinc-400">
                  User ID
                </Label>
                <p className="text-zinc-900 dark:text-zinc-100 font-mono text-sm">
                  {user?.id}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Literal.club Login Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect to Literal.club</DialogTitle>
            <DialogDescription>
              Enter your Literal.club credentials to sync your reading list.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleLiteralLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Connecting..." : "Connect"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Book Approval Modal */}
      <Dialog open={isApprovalModalOpen} onOpenChange={setIsApprovalModalOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              Review Books Before Syncing
            </DialogTitle>
            <DialogDescription>
              Please review the {pendingBooks.length} books that will be synced
              to your Koinon account. Click &quot;Approve & Sync&quot; to
              continue.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[50vh] pr-4">
            <div className="space-y-3">
              {pendingBooks.map((item) => (
                <div
                  key={item.book.id}
                  className="flex gap-4 p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                >
                  {/* Book Cover */}
                  <div className="flex-shrink-0">
                    {item.book.cover ? (
                      <img
                        src={item.book.cover}
                        alt={item.book.title}
                        className="w-16 h-24 object-cover rounded shadow-sm"
                      />
                    ) : (
                      <div className="w-16 h-24 bg-zinc-200 dark:bg-zinc-800 rounded flex items-center justify-center">
                        <BookOpen className="h-6 w-6 text-zinc-400" />
                      </div>
                    )}
                  </div>

                  {/* Book Details */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                      {item.book.title}
                    </h4>
                    {item.book.authors && item.book.authors.length > 0 && (
                      <p className="text-sm text-zinc-500 dark:text-zinc-500 truncate">
                        {item.book.authors
                          .map((author) => author.name)
                          .join(", ")}
                      </p>
                    )}
                    {item.book.subtitle && (
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 truncate mt-0.5">
                        {item.book.subtitle}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant="outline" className="capitalize">
                        {item.readingState.status}
                      </Badge>
                      {item.book.pageCount && (
                        <Badge variant="secondary">
                          {item.book.pageCount} pages
                        </Badge>
                      )}
                      {item.readingProgress && (
                        <Badge variant="default">
                          {item.readingProgress.progress}/
                          {item.readingProgress.capacity}{" "}
                          {item.readingProgress.unit}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsApprovalModalOpen(false);
                setPendingBooks([]);
              }}
              disabled={isApproving}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleApproveSync}
              disabled={isApproving}
              className="w-full sm:w-auto"
            >
              {isApproving ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Approve & Sync {pendingBooks.length} Books
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
