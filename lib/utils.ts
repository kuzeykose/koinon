import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Check if a string is a valid UUID format
 */
export function isUUID(str: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Generate a URL-safe slug from a name (kebab-case)
 * Used for community slugs
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with hyphens
    .replace(/-+/g, "-") // Collapse multiple hyphens
    .replace(/^-|-$/g, "") // Remove leading/trailing hyphens
    .slice(0, 50); // Limit length
}

/**
 * Generate a username from email prefix (snake_case)
 */
export function generateUsername(email: string): string {
  const prefix = email.split("@")[0] || "user";
  return prefix
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_") // Replace non-alphanumeric with underscores
    .replace(/_+/g, "_") // Collapse multiple underscores
    .replace(/^_|_$/g, "") // Remove leading/trailing underscores
    .slice(0, 30); // Limit length
}

/**
 * Validate username format
 * - 3-30 characters
 * - lowercase letters, numbers, and underscores only
 * - must start with a letter
 */
export function validateUsername(username: string): {
  valid: boolean;
  error?: string;
} {
  if (!username) {
    return { valid: false, error: "Username is required" };
  }

  if (username.length < 3) {
    return { valid: false, error: "Username must be at least 3 characters" };
  }

  if (username.length > 30) {
    return { valid: false, error: "Username must be at most 30 characters" };
  }

  if (!/^[a-z][a-z0-9_]*$/.test(username)) {
    return {
      valid: false,
      error:
        "Username must start with a letter and contain only lowercase letters, numbers, and underscores",
    };
  }

  return { valid: true };
}

/**
 * Validate community slug format
 * - 2-50 characters
 * - lowercase letters, numbers, and hyphens only
 */
export function validateSlug(slug: string): { valid: boolean; error?: string } {
  if (!slug) {
    return { valid: false, error: "Slug is required" };
  }

  if (slug.length < 2) {
    return { valid: false, error: "Slug must be at least 2 characters" };
  }

  if (slug.length > 50) {
    return { valid: false, error: "Slug must be at most 50 characters" };
  }

  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]{1,2}$/.test(slug)) {
    return {
      valid: false,
      error: "Slug must contain only lowercase letters, numbers, and hyphens",
    };
  }

  return { valid: true };
}
