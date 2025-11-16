# Database Schema for Reading States

## Tables to Create in Supabase

### 1. books table

```sql
CREATE TABLE books (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  isbn10 TEXT,
  isbn13 TEXT,
  language TEXT,
  page_count INTEGER,
  published_date TEXT,
  publisher TEXT,
  cover TEXT,
  authors JSONB,
  gradient_colors JSONB,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for faster queries
CREATE INDEX idx_books_title ON books(title);
CREATE INDEX idx_books_isbn10 ON books(isbn10);
CREATE INDEX idx_books_isbn13 ON books(isbn13);

-- Enable RLS (optional - books can be public or user-specific)
ALTER TABLE books ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read books
CREATE POLICY "Authenticated users can view books"
  ON books FOR SELECT
  USING (auth.role() = 'authenticated');

-- Allow all authenticated users to insert/update books (for syncing)
CREATE POLICY "Authenticated users can insert books"
  ON books FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update books"
  ON books FOR UPDATE
  USING (auth.role() = 'authenticated');
```

### 2. reading_states table

```sql
CREATE TABLE reading_states (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  profile_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, book_id)
);

-- Add index for faster queries
CREATE INDEX idx_reading_states_user_id ON reading_states(user_id);
CREATE INDEX idx_reading_states_book_id ON reading_states(book_id);

-- Enable RLS
ALTER TABLE reading_states ENABLE ROW LEVEL SECURITY;

-- Create policy for users to only access their own data
CREATE POLICY "Users can view their own reading states"
  ON reading_states FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reading states"
  ON reading_states FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reading states"
  ON reading_states FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reading states"
  ON reading_states FOR DELETE
  USING (auth.uid() = user_id);
```

### 3. reading_progresses table

```sql
CREATE TABLE reading_progresses (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL,
  capacity INTEGER,
  progress INTEGER NOT NULL DEFAULT 0,
  unit TEXT,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, book_id)
);

-- Add index for faster queries
CREATE INDEX idx_reading_progresses_user_id ON reading_progresses(user_id);
CREATE INDEX idx_reading_progresses_book_id ON reading_progresses(book_id);

-- Enable RLS
ALTER TABLE reading_progresses ENABLE ROW LEVEL SECURITY;

-- Create policy for users to only access their own data
CREATE POLICY "Users can view their own reading progresses"
  ON reading_progresses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reading progresses"
  ON reading_progresses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reading progresses"
  ON reading_progresses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reading progresses"
  ON reading_progresses FOR DELETE
  USING (auth.uid() = user_id);
```

## How to Apply

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Run each CREATE TABLE statement
4. Run the index creation statements
5. Run the RLS policies

## Notes

- **Three-table structure**: Books are stored centrally in the `books` table, while user-specific data is in `reading_states` and `reading_progresses`
- The `user_id` field in reading states and progresses links to the authenticated user in Supabase
- RLS (Row Level Security) policies ensure users can only access their own reading data
- The `books` table is accessible to all authenticated users (shared resource)
- The `UNIQUE(user_id, book_id)` constraint prevents duplicate entries for the same book per user
- The `synced_at` field tracks when the data was last synced from Literal.club
- Foreign key constraints ensure data integrity between tables
- Authors and gradient colors are stored as JSONB for flexibility
- Books table uses `ON DELETE CASCADE` so when a book is deleted, all related reading states and progresses are also deleted

## Data Flow

1. User syncs from Literal.club
2. Books are saved/updated in the `books` table
3. Reading states are saved in the `reading_states` table (referencing books)
4. Reading progresses are saved in the `reading_progresses` table (referencing books)
