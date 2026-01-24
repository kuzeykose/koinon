import { BookOpen } from "lucide-react";
import Link from "next/link";

const footerLinks = {
  Product: ["Features", "Pricing", "Integrations", "Changelog"],
  Resources: ["Blog", "Help Center", "Community", "Guides"],
  Company: ["About", "Careers", "Press", "Contact"],
  Legal: ["Privacy", "Terms", "Cookies", "License"],
};

export function Footer() {
  return (
    <footer className="bg-foreground py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-foreground">
                <BookOpen className="h-5 w-5 text-foreground" />
              </div>
              <span className="text-xl font-bold text-background">Bookly</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm text-background/70 leading-relaxed">
              Track your reading journey, discover new books, and connect with a community of readers.
            </p>
          </div>
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="mb-4 font-semibold text-background">{category}</h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link}>
                    <Link
                      href="#"
                      className="text-sm text-background/70 transition-colors hover:text-background"
                    >
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-background/20 pt-8 md:flex-row">
          <p className="text-sm text-background/60">
            © 2026 Bookly. All rights reserved.
          </p>
          <div className="flex gap-6">
            {["Twitter", "Instagram", "LinkedIn"].map((social) => (
              <Link
                key={social}
                href="#"
                className="text-sm text-background/60 transition-colors hover:text-background"
              >
                {social}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
