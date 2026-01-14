-- Migration: Add ISBN-13 as a source-agnostic identifier
-- This allows books to be identified independently of Open Library keys

-- Add ISBN-13 column
ALTER TABLE user_books ADD COLUMN IF NOT EXISTS isbn13 TEXT;

-- Index for lookups by ISBN (useful for duplicate detection and future integrations)
CREATE INDEX IF NOT EXISTS idx_user_books_isbn13 ON user_books(isbn13);

-- Unique constraint per user - prevents the same ISBN being added twice
-- Note: isbn13 can be NULL for books without ISBNs (older works, etc.)
CREATE UNIQUE INDEX IF NOT EXISTS user_books_user_isbn13_unique 
  ON user_books(user_id, isbn13) 
  WHERE isbn13 IS NOT NULL;
