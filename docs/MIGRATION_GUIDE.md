# Database Migration Guide: Removing Books Table

## Overview

This migration removes the `books` and `editions` tables and stores all book information directly in the `user_books` table. Each user now has their own copy of book data when they add a book to their shelf.

## Why This Change?

- **Simplified data model**: No need to maintain a shared books catalog
- **User-specific data**: Each user stores only the books they care about
- **Easier to manage**: No complex foreign key relationships
- **Better isolation**: User data is completely independent

## Migration Steps

### 1. Run the Migration SQL

Execute the migration file to restructure your database:

```bash
# In Supabase SQL Editor, run:
migrations/006_remove_books_table.sql
```

This migration will:

1. Add book information columns to `user_books`
2. Migrate existing data from `books` table to `user_books`
3. Drop the foreign key constraints
4. Remove `book_id` column
5. Drop `books` and `editions` tables
6. Create new indexes for performance

### 2. Verify Data Migration

After running the migration, verify that data was migrated correctly:

```sql
-- Check that all user_books have book information
SELECT
  COUNT(*) as total_books,
  COUNT(title) as books_with_title,
  COUNT(work_key) as books_with_work_key
FROM user_books;

-- Sample some data
SELECT
  id,
  user_id,
  work_key,
  title,
  authors,
  status,
  progress
FROM user_books
LIMIT 10;
```

## What Changed

### Database Schema

**Before:**

- `books` table: Stored all book information
- `editions` table: Stored book editions
- `user_books` table: Only stored reading status/progress with `book_id` reference

**After:**

- `user_books` table: Stores everything (book info + reading status/progress)
- No `books` or `editions` tables

### user_books Table Structure

New columns added:

```sql
-- Book identifier
book_key TEXT              -- Open Library key (work or edition, e.g., OL123W or OL123M)

-- Book metadata
title TEXT NOT NULL
cover TEXT

-- Authors (JSONB)
authors JSONB             -- [{"name": "Author Name"}]

-- Publication details
published_date TEXT
page_count INTEGER
language TEXT
```

Removed columns:

```sql
book_id UUID              -- No longer needed
```

### Code Changes

#### 1. Book Actions (`lib/actions/book-actions.ts`)

- `addBookToShelf()`: Now inserts all book data directly into `user_books`
- `updateUserBook()`: Uses `id` (user_books id) instead of `bookId`
- Removed: Edition fetching logic (no longer storing editions in DB)

#### 2. Shelf Page (`app/dashboard/shelf/page.tsx`)

- Simplified: Query only `user_books` table
- No more joins with `books` table
- All book data is directly available

#### 3. Book Card (`components/shelf/book-card.tsx`)

- Now accepts full `UserBook` object with all book info
- No separate `Book` and `UserBook` props needed

#### 4. Book Detail Page (`app/dashboard/book/[id]/page.tsx`)

- Updated `addBookToShelf` to pass `workKey`/`editionKey` instead of `openLibraryKey`
- Includes all book metadata when adding to shelf

#### 5. Settings Page (`app/dashboard/settings/page.tsx`)

- Displays user account information

#### 6. Community Feed (`components/community/community-feed.tsx`)

- Query `user_books` directly for book information
- No join with `books` table needed

## API Routes

The following API routes remain unchanged as they query Open Library directly:

- `/api/works/[id]/route.ts` - Fetches work details from Open Library
- `/api/books/[id]/route.ts` - Fetches edition details from Open Library
- `/api/editions/route.ts` - Fetches editions list from Open Library
- `/api/works/search/route.ts` - Searches Open Library

## Data Deduplication

### Before

Books were deduplicated globally in the `books` table using `work_key` or `isbn13`.

### After

Each user has their own copy of book data. To prevent duplicate books per user:

- Unique index on `(user_id, work_key)` for books with work keys
- Unique index on `(user_id, edition_key)` for editions without work keys
- Check for existing books before adding to shelf

## Benefits

1. **Simpler queries**: No joins needed to display user books
2. **User isolation**: Each user's data is independent
3. **Easier to modify**: Users can have different metadata for the same book if needed
4. **Better performance**: Fewer tables to query
5. **Clearer data ownership**: All user data in one place

## Potential Drawbacks

1. **Data duplication**: Same book stored multiple times if multiple users have it
2. **Storage**: More storage used compared to shared books table
3. **Updates**: If book metadata needs updating, must update each user's copy

## Rollback Plan

If you need to rollback:

1. Create new `books` table
2. Extract unique books from `user_books` into `books`
3. Add `book_id` back to `user_books`
4. Create foreign key relationship
5. Restore old code

**Note**: Keep a backup before running the migration!

## Testing Checklist

- [ ] Users can add books to their shelf
- [ ] Users can view their shelf with all book details
- [ ] Users can update reading progress
- [ ] Community feed shows members' books correctly
- [ ] Book detail pages work for both works and editions
- [ ] Book editions display correctly

## Support

If you encounter issues:

1. Check Supabase logs for errors
2. Verify all migrations ran successfully
3. Check that indexes were created
4. Ensure RLS policies are working
