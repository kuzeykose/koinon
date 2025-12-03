"use client";

import { useState } from "react";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Community name must be at least 2 characters.",
  }),
  description: z.string().optional(),
});

export function CreateCommunityDialog() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) {
      toast.error("You must be logged in to create a community");
      return;
    }

    try {
      // 1. Create the community
      const { data: community, error: communityError } = await supabase
        .from("communities")
        .insert({
          name: values.name,
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
        // Rollback community creation if member creation fails (optional but good practice)
        // For now, just log it, as RLS policies might prevent deletion of the community if not careful
        console.error("Error adding member:", memberError);
        throw memberError;
      }

      toast.success("Community created successfully!");
      setOpen(false);
      form.reset();
      router.refresh();
      // Navigate to the new community
      router.push(`/dashboard/communities/${community.id}`);
    } catch (error) {
      console.error("Error creating community:", error);
      toast.error("Failed to create community. Please try again.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
