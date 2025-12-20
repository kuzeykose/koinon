-- 1. Add work_key to books table (to group editions)
ALTER TABLE books ADD COLUMN IF NOT EXISTS work_key TEXT UNIQUE;

-- 2. Create editions table
CREATE TABLE editions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  
  -- Edition specific metadata
  title TEXT, -- Editions might have slightly different titles
  isbn13 TEXT,
  isbn10 TEXT,
  publisher TEXT,
  page_count INTEGER,
  published_date TEXT,
  cover TEXT,
  language TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Add indexes for editions
CREATE INDEX idx_editions_book_id ON editions(book_id);
CREATE INDEX idx_editions_isbn13 ON editions(isbn13);
CREATE INDEX idx_editions_isbn10 ON editions(isbn10);

-- Enable RLS on editions
ALTER TABLE editions ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for editions (mirroring books)
-- Authenticated users can view editions
CREATE POLICY "Authenticated users can view editions"
  ON editions FOR SELECT
  USING (auth.role() = 'authenticated');

-- Authenticated users can insert editions (needed when adding books)
CREATE POLICY "Authenticated users can insert editions"
  ON editions FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Authenticated users can update editions
CREATE POLICY "Authenticated users can update editions"
  ON editions FOR UPDATE
  USING (auth.role() = 'authenticated');

-- 5. Data Migration: Move existing specific data from books to a new edition row
-- We treat the existing 'books' row as the "Work" and create one "Edition" for it.
INSERT INTO editions (book_id, title, isbn13, isbn10, publisher, page_count, published_date, cover, language)
SELECT 
  id as book_id, 
  title, 
  isbn13, 
  isbn10, 
  publisher, 
  page_count, 
  published_date, 
  cover, 
  language
FROM books;

-- 6. Optional: We populate work_key for existing books if they don't have one
-- For now we leave it null or could set it to a UUID if desired. 
-- Let's leave it null as these are likely "Custom Works" or we can't be sure of the grouping yet.
