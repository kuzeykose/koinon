-- Migration 006: Remove books table and store all book info in user_books
-- This migration restructures the database to store book information directly in user_books

-- ============================================================
-- STEP 1: Add book information columns to user_books
-- ============================================================

-- Add Open Library key (can be work key like OL123W or edition key like OL123M)
ALTER TABLE user_books ADD COLUMN IF NOT EXISTS book_key TEXT;

-- Add book metadata
ALTER TABLE user_books ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE user_books ADD COLUMN IF NOT EXISTS cover TEXT;

-- Add author data (stored as JSONB)
ALTER TABLE user_books ADD COLUMN IF NOT EXISTS authors JSONB; -- [{"name": "Author Name"}]

-- Add publication details
ALTER TABLE user_books ADD COLUMN IF NOT EXISTS published_date TEXT;
ALTER TABLE user_books ADD COLUMN IF NOT EXISTS page_count INTEGER;
ALTER TABLE user_books ADD COLUMN IF NOT EXISTS language TEXT;

-- ============================================================
-- STEP 2: Migrate existing data from books table to user_books
-- ============================================================

-- Update user_books with book information from books table
UPDATE user_books ub
SET 
  book_key = b.work_key,
  title = b.title,
  cover = b.cover,
  authors = b.authors,
  published_date = b.published_date,
  page_count = b.page_count
FROM books b
WHERE ub.book_id = b.id;

-- ============================================================
-- STEP 3: Make title NOT NULL (required field)
-- ============================================================

-- Set default title for any rows that don't have one
UPDATE user_books SET title = 'Unknown Title' WHERE title IS NULL;

-- Add NOT NULL constraint
ALTER TABLE user_books ALTER COLUMN title SET NOT NULL;

-- ============================================================
-- STEP 4: Drop foreign key constraint and book_id column
-- ============================================================

-- Drop the foreign key constraint
ALTER TABLE user_books DROP CONSTRAINT IF EXISTS user_books_book_id_fkey;

-- Drop the unique constraint that includes book_id
ALTER TABLE user_books DROP CONSTRAINT IF EXISTS user_books_user_id_book_id_key;

-- Drop the book_id column
ALTER TABLE user_books DROP COLUMN IF EXISTS book_id;

-- Add new unique constraint on user_id and book_key
-- This prevents duplicate entries for the same book per user
CREATE UNIQUE INDEX IF NOT EXISTS user_books_user_book_key_unique 
  ON user_books(user_id, book_key) 
  WHERE book_key IS NOT NULL;

-- ============================================================
-- STEP 5: Create indexes for better query performance
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_user_books_user_id ON user_books(user_id);
CREATE INDEX IF NOT EXISTS idx_user_books_status ON user_books(status);
CREATE INDEX IF NOT EXISTS idx_user_books_book_key ON user_books(book_key);
CREATE INDEX IF NOT EXISTS idx_user_books_title ON user_books(title);

-- ============================================================
-- STEP 6: Drop the books and editions tables
-- ============================================================

-- Drop editions table first (has foreign key to books)
DROP TABLE IF EXISTS editions CASCADE;

-- Drop books table
DROP TABLE IF EXISTS books CASCADE;

-- ============================================================
-- VERIFICATION (uncomment to run manually)
-- ============================================================
-- SELECT 
--   id, 
--   user_id, 
--   book_key, 
--   title, 
--   authors, 
--   status, 
--   progress 
-- FROM user_books 
-- LIMIT 10;
