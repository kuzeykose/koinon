-- Migration: Merge reading_states and reading_progresses into user_books
-- This migration combines the two separate tables into a single unified table
-- Run this in your Supabase SQL Editor

-- Step 1: Create the new unified user_books table
CREATE TABLE IF NOT EXISTS user_books (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL,
  -- Reading status fields (from reading_states)
  status TEXT NOT NULL DEFAULT 'IS_READING',
  -- Reading progress fields (from reading_progresses)
  progress INTEGER NOT NULL DEFAULT 0,
  capacity INTEGER,
  unit TEXT DEFAULT 'pages',
  completed BOOLEAN NOT NULL DEFAULT false,
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, book_id)
);

-- Step 2: Migrate data from reading_states and reading_progresses
-- Join both tables and insert into user_books
INSERT INTO user_books (
  id,
  user_id,
  book_id,
  profile_id,
  status,
  progress,
  capacity,
  unit,
  completed,
  created_at,
  synced_at
)
SELECT 
  rs.id,
  rs.user_id,
  rs.book_id,
  rs.profile_id,
  rs.status,
  COALESCE(rp.progress, 0),
  rp.capacity,
  COALESCE(rp.unit, 'pages'),
  COALESCE(rp.completed, false),
  rs.created_at,
  GREATEST(rs.synced_at, COALESCE(rp.synced_at, rs.synced_at))
FROM reading_states rs
LEFT JOIN reading_progresses rp ON rs.user_id = rp.user_id AND rs.book_id = rp.book_id
ON CONFLICT (user_id, book_id) DO UPDATE SET
  status = EXCLUDED.status,
  progress = EXCLUDED.progress,
  capacity = EXCLUDED.capacity,
  unit = EXCLUDED.unit,
  completed = EXCLUDED.completed,
  synced_at = EXCLUDED.synced_at;

-- Step 3: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_books_user_id ON user_books(user_id);
CREATE INDEX IF NOT EXISTS idx_user_books_book_id ON user_books(book_id);
CREATE INDEX IF NOT EXISTS idx_user_books_status ON user_books(status);

-- Step 4: Enable Row Level Security
ALTER TABLE user_books ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies

-- Policy: Users can view their own user_books
CREATE POLICY "Users can view their own user_books"
  ON user_books FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own user_books
CREATE POLICY "Users can insert their own user_books"
  ON user_books FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own user_books
CREATE POLICY "Users can update their own user_books"
  ON user_books FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own user_books
CREATE POLICY "Users can delete their own user_books"
  ON user_books FOR DELETE
  USING (auth.uid() = user_id);

-- Policy: Community members can view each other's user_books
CREATE POLICY "Community members can view each other's user_books"
  ON user_books FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM community_members cm_me
      JOIN community_members cm_target ON cm_me.community_id = cm_target.community_id
      WHERE cm_me.user_id = auth.uid()
      AND cm_target.user_id = user_books.user_id
      AND cm_me.status = 'accepted'
      AND cm_target.status = 'accepted'
    )
  );

-- Step 6: Drop old tables (CAUTION: Only run after verifying data migration)
-- Uncomment these lines after confirming the migration was successful

-- DROP TABLE IF EXISTS reading_progresses;
-- DROP TABLE IF EXISTS reading_states;

-- Verification query - run this to verify data was migrated correctly:
-- SELECT 
--   (SELECT COUNT(*) FROM reading_states) as old_states_count,
--   (SELECT COUNT(*) FROM user_books) as new_user_books_count;

