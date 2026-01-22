# Database Schema for Reading States & Communities

## Tables to Create in Supabase

### 1. user_books table

This table stores a user's books along with reading status and progress.
Book information is stored directly in this table - there is no separate books table.

```sql
CREATE TABLE user_books (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Book identifier (Open Library key)
  book_key TEXT, -- Can be work key (OL123W) or edition key (OL123M)

  -- Source-agnostic identifier
  isbn13 TEXT, -- ISBN-13 for portable identification across data sources

  -- Book metadata
  title TEXT NOT NULL,
  cover TEXT,

  -- Authors (stored as JSONB)
  authors JSONB, -- [{"name": "Author Name"}]

  -- Publication details
  published_date TEXT,
  page_count INTEGER,
  language TEXT,

  -- Reading status
  status TEXT NOT NULL DEFAULT 'WANT_TO_READ',

  -- Reading progress
  progress INTEGER NOT NULL DEFAULT 0,
  capacity INTEGER,
  unit TEXT DEFAULT 'pages',
  completed BOOLEAN NOT NULL DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for faster queries
CREATE INDEX idx_user_books_user_id ON user_books(user_id);
CREATE INDEX idx_user_books_status ON user_books(status);
CREATE INDEX idx_user_books_book_key ON user_books(book_key);
CREATE INDEX idx_user_books_isbn13 ON user_books(isbn13);
CREATE INDEX idx_user_books_title ON user_books(title);

-- Unique constraint to prevent duplicate books per user
CREATE UNIQUE INDEX user_books_user_book_key_unique
  ON user_books(user_id, book_key)
  WHERE book_key IS NOT NULL;

-- Unique constraint for ISBN-13 per user (prevents same ISBN being added twice)
CREATE UNIQUE INDEX user_books_user_isbn13_unique
  ON user_books(user_id, isbn13)
  WHERE isbn13 IS NOT NULL;

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

-- Policy to allow viewing user_books of users with public profiles
CREATE POLICY "Public profiles books are viewable by authenticated users"
  ON user_books FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = user_books.user_id
      AND profiles.is_public = true
    )
  );
```

### 2. communities table

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

### 3. community_members table

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

### 4. profiles table

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  email TEXT, -- Optional: synced from auth.users for display ease, but keep in mind privacy
  is_public BOOLEAN DEFAULT false, -- Controls whether user's shelf is publicly viewable
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Presence tracking
  last_seen TIMESTAMPTZ, -- Last activity timestamp (updated every ~30 seconds)
  status TEXT DEFAULT 'offline' -- Current status: 'online', 'reading', 'offline'
  is_stats_public BOOLEAN DEFAULT false, -- Controls whether user's reading statistics are publicly viewable
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for presence queries
CREATE INDEX idx_profiles_last_seen ON profiles(last_seen);
CREATE INDEX idx_profiles_status ON profiles(status);

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

### 5. Profile Auto-Creation Trigger

This trigger automatically creates a profile for every new user (works with both email and social authentication):

```sql
-- Function to automatically create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function after a new user is inserted
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## How to Apply

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Run each CREATE TABLE statement
4. Run the index creation statements
5. Run the RLS policies

## Recent Migrations

### Migration 012: User Presence Tracking

Adds online status tracking to profiles. Run this migration to enable the online status feature:

```sql
-- File: migrations/012_add_user_presence.sql

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'offline';
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON profiles(last_seen);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);
```

**Status values:**
- `online`: User is active on the site
- `reading`: User has an active pomodoro timer
- `offline`: User is inactive or manually set themselves invisible

## Notes

- **user_books**: Each user's book is stored with complete book information. Books from Open Library are identified by `book_key` (work or edition key). Additionally, `isbn13` provides a source-agnostic identifier that enables portability across different data sources.
- **Status values**: `WANT_TO_READ`, `IS_READING`, `COMPLETED`, `PAUSED`, `ABANDONED`
- **Unit values**: Typically `pages`, `chapters`, or `%`
- **Profiles**: Added to allow displaying user names/avatars in communities. The `is_public` field controls whether a user's shelf is publicly viewable.
- **Privacy Settings**: When `is_public` is true, any authenticated user can view that user's books. When false, only the user themselves and their community members can view their books.
- The `user_id` field in user_books links to the authenticated user in Supabase
- RLS (Row Level Security) policies ensure users can only access their own reading data, unless they've made their profile public or are in the same community
- The unique constraints prevent duplicate entries for the same book per user
- Foreign key constraints ensure data integrity between tables
- Authors and subjects are stored as JSONB for flexibility
- Book information is denormalized - each user stores their own copy of the book data

## Open Library API

Books are fetched from Open Library. Key endpoints:

- Search: `https://openlibrary.org/search.json?q={query}`
- Work: `https://openlibrary.org/works/{work_id}.json`
- Edition: `https://openlibrary.org/books/{edition_id}.json`
- Cover: `https://covers.openlibrary.org/b/id/{cover_id}-{size}.jpg` (sizes: S, M, L)
- Author: `https://openlibrary.org/authors/{author_id}.json`

### 6. reading_progress_history table

This table stores snapshots of reading progress to enable statistics tracking and visualization.

```sql
CREATE TABLE reading_progress_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_book_id UUID NOT NULL REFERENCES user_books(id) ON DELETE CASCADE,

  -- Snapshot of progress at this point in time
  progress INTEGER NOT NULL,
  capacity INTEGER,
  status TEXT NOT NULL,

  -- Calculated field: pages read in this session (delta from previous)
  pages_read INTEGER DEFAULT 0,

  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_progress_history_user_id ON reading_progress_history(user_id);
CREATE INDEX idx_progress_history_user_book_id ON reading_progress_history(user_book_id);
CREATE INDEX idx_progress_history_recorded_at ON reading_progress_history(recorded_at);

-- Enable RLS
ALTER TABLE reading_progress_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own progress history
CREATE POLICY "Users can view their own progress history"
  ON reading_progress_history FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own progress history
CREATE POLICY "Users can insert their own progress history"
  ON reading_progress_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can view other users' stats if they made them public
CREATE POLICY "Public stats are viewable"
  ON reading_progress_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = reading_progress_history.user_id
      AND profiles.is_stats_public = true
    )
  );
```

### 7. pomodoro_sessions table

This table tracks Pomodoro timer sessions for focused reading.

```sql
CREATE TABLE pomodoro_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_book_id UUID REFERENCES user_books(id) ON DELETE SET NULL,
  
  -- Session details
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_minutes INTEGER NOT NULL, -- Planned duration
  completed BOOLEAN DEFAULT false,
  session_type TEXT NOT NULL CHECK (session_type IN ('work', 'break')),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_pomodoro_sessions_user_id ON pomodoro_sessions(user_id);
CREATE INDEX idx_pomodoro_sessions_user_book_id ON pomodoro_sessions(user_book_id);
CREATE INDEX idx_pomodoro_sessions_started_at ON pomodoro_sessions(started_at);

-- Enable RLS
ALTER TABLE pomodoro_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own pomodoro sessions
CREATE POLICY "Users can view their own pomodoro sessions"
  ON pomodoro_sessions FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own pomodoro sessions
CREATE POLICY "Users can insert their own pomodoro sessions"
  ON pomodoro_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own pomodoro sessions
CREATE POLICY "Users can update their own pomodoro sessions"
  ON pomodoro_sessions FOR UPDATE
  USING (auth.uid() = user_id);
```

**Session types:**
- `work`: Focus session (default 25 minutes)
- `break`: Rest session (default 5 minutes)

**Features:**
- Sessions can be linked to a specific book the user is reading
- When a work session is active, the user's status is set to "reading" (purple indicator)
- Completed sessions are tracked for potential statistics

## Data Flow

1. User searches for books via Open Library API
2. User adds a book to their shelf
3. Book data is saved directly to the `user_books` table with all book information
4. User can update their progress and status over time
5. Each progress update logs a snapshot to `reading_progress_history` for statistics
6. Each user has their own copy of the book data in their user_books entries

## Privacy Model

Users have granular control over their privacy settings:

| `is_public` | `is_stats_public` | Others can see shelf | Others can see stats |
| ----------- | ----------------- | -------------------- | -------------------- |
| false       | false             | No                   | No                   |
| true        | false             | Yes                  | No                   |
| false       | true              | No                   | Yes                  |
| true        | true              | Yes                  | Yes                  |
