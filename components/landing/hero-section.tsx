"use client";

import { Button } from "@/components/ui/button";
import { BookOpen, ArrowRight } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-background py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-8 items-center">
          <div className="max-w-xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground">
              <BookOpen className="h-4 w-4" />
              <span>Your personal reading companion</span>
            </div>
            <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl text-balance">
              Track your reading journey with ease
            </h1>
            <p className="mb-8 text-lg text-muted-foreground leading-relaxed">
              Discover new books, track your progress, set reading goals, and build your personal library. 
              Join thousands of readers who have transformed their reading habits.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row">
              <Button size="lg" className="gap-2">
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline">
                See How It Works
              </Button>
            </div>
            <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-8 w-8 rounded-full bg-accent border-2 border-background"
                    />
                  ))}
                </div>
              </div>
              <span>
                <strong className="text-foreground">10,000+</strong> readers tracking their books
              </span>
            </div>
          </div>
          <div className="relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              <div className="rounded-2xl bg-card p-6 shadow-xl border border-border">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-semibold text-card-foreground">Currently Reading</h3>
                  <span className="text-sm text-muted-foreground">3 books</span>
                </div>
                <div className="space-y-4">
                  {[
                    { title: "Atomic Habits", author: "James Clear", progress: 72 },
                    { title: "The Psychology of Money", author: "Morgan Housel", progress: 45 },
                    { title: "Deep Work", author: "Cal Newport", progress: 23 },
                  ].map((book) => (
                    <div key={book.title} className="flex gap-4 rounded-lg bg-secondary/50 p-3">
                      <div className="h-16 w-12 rounded bg-accent/30 flex items-center justify-center">
                        <BookOpen className="h-6 w-6 text-accent-foreground/60" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-card-foreground">{book.title}</h4>
                        <p className="text-sm text-muted-foreground">{book.author}</p>
                        <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
                          <div
                            className="h-1.5 rounded-full bg-primary"
                            style={{ width: `${book.progress}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-medium text-foreground">{book.progress}%</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="absolute -bottom-4 -left-4 rounded-xl bg-card p-4 shadow-lg border border-border">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/20">
                    <span className="text-lg">📚</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-card-foreground">Reading Goal</p>
                    <p className="text-xs text-muted-foreground">24 of 52 books</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
