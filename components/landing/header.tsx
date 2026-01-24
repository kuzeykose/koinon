"use client";

import { Button } from "@/components/ui/button";
import { BookOpen, Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "Community", href: "#community" },
  { label: "Blog", href: "#blog" },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <BookOpen className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">Bookly</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" className="text-foreground">Log in</Button>
            <Button>Sign up</Button>
          </div>
          <button
            type="button"
            className="md:hidden p-2 text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background">
          <nav className="container mx-auto px-4 py-4 flex flex-col gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="flex flex-col gap-2 pt-4 border-t border-border">
              <Button variant="ghost" className="w-full justify-center">Log in</Button>
              <Button className="w-full">Sign up</Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
