"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight } from "lucide-react";
import { useState } from "react";

export function CTASection() {
  const [email, setEmail] = useState("");

  return (
    <section className="bg-secondary py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-secondary-foreground md:text-4xl lg:text-5xl text-balance">
            Start your reading journey today
          </h2>
          <p className="mb-8 text-lg text-muted-foreground">
            Join thousands of readers who have already transformed their reading habits. 
            It&apos;s free to get started.
          </p>
          <form
            onSubmit={(e) => e.preventDefault()}
            className="mx-auto flex max-w-md flex-col gap-3 sm:flex-row"
          >
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 bg-card border-border text-foreground"
            />
            <Button type="submit" size="lg" className="h-12 gap-2">
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
          <p className="mt-4 text-sm text-muted-foreground">
            Free forever. No credit card required.
          </p>
        </div>
      </div>
    </section>
  );
}
