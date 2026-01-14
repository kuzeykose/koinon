"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Check, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { generateSlug, validateSlug } from "@/lib/utils";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Community name must be at least 2 characters.",
  }),
  slug: z.string().min(2, {
    message: "URL slug must be at least 2 characters.",
  }),
  description: z.string().optional(),
});

export function CreateCommunityDialog() {
  const [open, setOpen] = useState(false);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [isSlugAvailable, setIsSlugAvailable] = useState<boolean | null>(null);
  const [slugError, setSlugError] = useState<string | null>(null);
  const { user } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
    },
  });

  const watchName = form.watch("name");
  const watchSlug = form.watch("slug");

  // Auto-generate slug from name
  useEffect(() => {
    if (watchName && !form.getFieldState("slug").isDirty) {
      const generatedSlug = generateSlug(watchName);
      form.setValue("slug", generatedSlug);
    }
  }, [watchName, form]);

  // Check slug availability
  const checkSlugAvailability = useCallback(
    async (slug: string) => {
      if (!slug) {
        setIsSlugAvailable(null);
        return;
      }

      const validation = validateSlug(slug);
      if (!validation.valid) {
        setSlugError(validation.error || null);
        setIsSlugAvailable(null);
        return;
      }

      setSlugError(null);
      setIsCheckingSlug(true);

      const { data } = await supabase
        .from("communities")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      setIsCheckingSlug(false);
      setIsSlugAvailable(!data);
      if (data) {
        setSlugError("This URL is already taken");
      }
    },
    [supabase]
  );

  // Debounce slug check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (watchSlug) {
        checkSlugAvailability(watchSlug);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [watchSlug, checkSlugAvailability]);

  // Handle slug input change
  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    form.setValue("slug", value, { shouldDirty: true });
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) {
      toast.error("You must be logged in to create a community");
      return;
    }

    if (!isSlugAvailable) {
      toast.error("Please choose a different URL slug");
      return;
    }

    try {
      // 1. Create the community with slug
      const { data: community, error: communityError } = await supabase
        .from("communities")
        .insert({
          name: values.name,
          slug: values.slug,
          description: values.description,
          created_by: user.id,
        })
        .select()
        .single();

      if (communityError) throw communityError;

      // 2. Add the creator as an admin member
      const { error: memberError } = await supabase
        .from("community_members")
        .insert({
          community_id: community.id,
          user_id: user.id,
          role: "admin",
          status: "accepted",
        });

      if (memberError) {
        console.error("Error adding member:", memberError);
        throw memberError;
      }

      toast.success("Community created successfully!");
      setOpen(false);
      form.reset();
      setIsSlugAvailable(null);
      setSlugError(null);
      router.refresh();
      // Navigate to the new community using slug
      router.push(`/dashboard/communities/${community.slug}`);
    } catch (error) {
      console.error("Error creating community:", error);
      toast.error("Failed to create community. Please try again.");
    }
  }

  // Reset form state when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      form.reset();
      setIsSlugAvailable(null);
      setSlugError(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Community
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Community</DialogTitle>
          <DialogDescription>
            Create a new space to share your reading journey with others.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Book Club 2024" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL Slug</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        placeholder="book-club-2024"
                        {...field}
                        onChange={handleSlugChange}
                        className={
                          slugError
                            ? "border-destructive pr-10"
                            : isSlugAvailable
                            ? "border-green-500 pr-10"
                            : ""
                        }
                      />
                      {isCheckingSlug && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                      {!isCheckingSlug && isSlugAvailable && (
                        <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                      )}
                    </div>
                  </FormControl>
                  {slugError ? (
                    <p className="text-sm text-destructive">{slugError}</p>
                  ) : (
                    <FormDescription>
                      Your community URL will be: /communities/
                      {watchSlug || "..."}
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="A place for sci-fi lovers..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting || !isSlugAvailable}
              >
                {form.formState.isSubmitting ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
