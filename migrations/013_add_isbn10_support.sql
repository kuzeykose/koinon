-- Migration: Add ISBN-10 support alongside ISBN-13
-- Some books only have ISBN-10, especially older publications

-- Add ISBN-10 column
ALTER TABLE user_books ADD COLUMN IF NOT EXISTS isbn10 TEXT;

-- Index for lookups by ISBN-10
CREATE INDEX IF NOT EXISTS idx_user_books_isbn10 ON user_books(isbn10);

-- Unique constraint per user for ISBN-10
-- Note: isbn10 can be NULL for books without ISBNs
CREATE UNIQUE INDEX IF NOT EXISTS user_books_user_isbn10_unique 
  ON user_books(user_id, isbn10) 
  WHERE isbn10 IS NOT NULL;
