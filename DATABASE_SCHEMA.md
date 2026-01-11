# Database Schema for Reading States & Communities

## Tables to Create in Supabase

### 1. books table (The "Work")

Represents the abstract "Work" (e.g., "Moby Dick").

```sql
CREATE TABLE books (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  work_key TEXT UNIQUE, -- Used for grouping editions (e.g. OL123W or custom UUID)
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  authors JSONB,
  subjects JSONB,
  -- Legacy columns (kept for backward compatibility during migration, moved to editions)
  isbn13 TEXT UNIQUE,
  isbn10 TEXT,
  language TEXT,
  page_count INTEGER,
  published_date TEXT,
  publisher TEXT,
  cover TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_books_title ON books(title);
CREATE INDEX idx_books_work_key ON books(work_key);
```

### 1a. editions table (The specific versions)

Represents specific published versions (e.g., "Moby Dick, Penguin Classics 2003").

```sql
CREATE TABLE editions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  title TEXT,
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

-- Indexes
CREATE INDEX idx_editions_book_id ON editions(book_id);
CREATE INDEX idx_editions_isbn13 ON editions(isbn13);
CREATE INDEX idx_editions_isbn10 ON editions(isbn10);
```

### RLS Policies for Books & Editions
All authenticated users can read/write to these tables (shared catalog).
```sql
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE editions ENABLE ROW LEVEL SECURITY;

-- (Policies omitted for brevity, generally "Authenticated users can select/insert/update")
```

### 2. user_books table

This table tracks a user's reading status and progress for books.

```sql
CREATE TABLE user_books (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  -- Reading status
  status TEXT NOT NULL DEFAULT 'WANT_TO_READ',
  -- Reading progress
  progress INTEGER NOT NULL DEFAULT 0,
  capacity INTEGER,
  unit TEXT DEFAULT 'pages',
  completed BOOLEAN NOT NULL DEFAULT false,
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, book_id)
);

-- Add indexes for faster queries
CREATE INDEX idx_user_books_user_id ON user_books(user_id);
CREATE INDEX idx_user_books_book_id ON user_books(book_id);
CREATE INDEX idx_user_books_status ON user_books(status);

-- Enable RLS
ALTER TABLE user_books ENABLE ROW LEVEL SECURITY;

-- Create policy for users to only access their own data
CREATE POLICY "Users can view their own user_books"
  ON user_books FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own user_books"
  ON user_books FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own user_books"
  ON user_books FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own user_books"
  ON user_books FOR DELETE
  USING (auth.uid() = user_id);

-- Policy to allow viewing user_books of fellow community members
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
```

### 3. communities table

```sql
CREATE TABLE communities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  image_url TEXT
);

-- Enable RLS
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view communities (or restrict to members?)
-- Let's allow authenticated users to view communities so they can see invitations
CREATE POLICY "Authenticated users can view communities"
  ON communities FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy: Authenticated users can create communities
CREATE POLICY "Authenticated users can create communities"
  ON communities FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = created_by);

-- Policy: Creator can update
CREATE POLICY "Creators can update their communities"
  ON communities FOR UPDATE
  USING (auth.uid() = created_by);
```

### 4. community_members table

```sql
CREATE TABLE community_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(community_id, user_id)
);

-- Indexes
CREATE INDEX idx_community_members_community_id ON community_members(community_id);
CREATE INDEX idx_community_members_user_id ON community_members(user_id);

-- Enable RLS
ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;

-- Helper function to prevent infinite recursion in policies
CREATE OR REPLACE FUNCTION is_community_member(_community_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM community_members
    WHERE community_id = _community_id
    AND user_id = auth.uid()
  );
$$;
-- Important: Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION is_community_member TO authenticated;

-- Policy: Users can view memberships if they are in the community or invited
CREATE POLICY "Users can view community memberships"
  ON community_members FOR SELECT
  USING (
    auth.uid() = user_id OR
    (status = 'accepted' AND is_community_member(community_id))
  );

-- Policy: Creator/Admins can invite (insert)
-- Simplified: Any member can invite? Or just admin? Let's say Admin.
-- For creation: The creator inserts themselves as admin.
CREATE POLICY "Admins can invite members"
  ON community_members FOR INSERT
  WITH CHECK (
    -- Allow user to add themselves (when creating community)
    (auth.uid() = user_id AND role = 'admin' AND status = 'accepted') OR
    -- Allow admins to invite others
    EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = community_members.community_id
      AND cm.user_id = auth.uid()
      AND cm.role = 'admin'
      AND cm.status = 'accepted'
    )
  );

-- Policy: Users can update their own status (accept/reject)
CREATE POLICY "Users can update their own membership status"
  ON community_members FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Admins can remove members (delete) or users can leave
CREATE POLICY "Admins or self can remove members"
  ON community_members FOR DELETE
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = community_members.community_id
      AND cm.user_id = auth.uid()
      AND cm.role = 'admin'
      AND cm.status = 'accepted'
    )
  );
```

### 5. profiles table

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  email TEXT, -- Optional: synced from auth.users for display ease, but keep in mind privacy
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Public read access
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

-- Policy: Users can insert their own profile
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);
```

## How to Apply

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Run each CREATE TABLE statement
4. Run the index creation statements
5. Run the RLS policies

## Notes

- **books**: Books are sourced from Open Library API. The `isbn13` is required and used as the unique identifier for deduplication.
- **user_books**: Tracks a user's relationship with a book (status, progress).
- **Status values**: `WANT_TO_READ`, `IS_READING`, `COMPLETED`, `PAUSED`, `ABANDONED`
- **Unit values**: Typically `pages`, `chapters`, or `%`
- **Profiles**: Added to allow displaying user names/avatars in communities.
- The `user_id` field in user_books links to the authenticated user in Supabase
- RLS (Row Level Security) policies ensure users can only access their own reading data
- The `books` table is accessible to all authenticated users (shared resource)
- The `UNIQUE(user_id, book_id)` constraint prevents duplicate entries for the same book per user
- Foreign key constraints ensure data integrity between tables
- Authors and subjects are stored as JSONB for flexibility
- Books table uses `ON DELETE CASCADE` so when a book is deleted, all related user_books are also deleted

## Open Library API

Books are fetched from Open Library. Key endpoints:

- Search: `https://openlibrary.org/search.json?q={query}`
- Work: `https://openlibrary.org/works/{work_id}.json`
- Edition: `https://openlibrary.org/books/{edition_id}.json`
- Cover: `https://covers.openlibrary.org/b/id/{cover_id}-{size}.jpg` (sizes: S, M, L)
- Author: `https://openlibrary.org/authors/{author_id}.json`

## Data Flow

1. User searches for books via Open Library API
2. User adds a book to their shelf
3. Book data is saved to the `books` table (if not already exists)
4. User's reading status/progress is saved to `user_books` table
5. User can update their progress and status over time
