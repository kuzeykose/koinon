-- Migration 003: Convert user_books.id from TEXT to UUID
-- Run this migration in Supabase SQL Editor

-- ============================================================
-- STEP 1: Add new UUID column for id
-- ============================================================

ALTER TABLE user_books ADD COLUMN IF NOT EXISTS new_id UUID DEFAULT gen_random_uuid();

-- ============================================================
-- STEP 2: Drop primary key constraint
-- ============================================================

ALTER TABLE user_books DROP CONSTRAINT IF EXISTS user_books_pkey;

-- ============================================================
-- STEP 3: Drop old TEXT id and rename new_id to id
-- ============================================================

ALTER TABLE user_books DROP COLUMN id;
ALTER TABLE user_books RENAME COLUMN new_id TO id;

-- ============================================================
-- STEP 4: Add primary key constraint with new UUID id
-- ============================================================

ALTER TABLE user_books ADD PRIMARY KEY (id);

-- ============================================================
-- VERIFICATION (uncomment to run manually)
-- ============================================================
-- SELECT id, book_id, user_id, status FROM user_books LIMIT 10;



