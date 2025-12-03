# Database Schema for Reading States & Communities

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

-- NEW: Policy to allow viewing reading states of fellow community members
CREATE POLICY "Community members can view each other's reading states"
  ON reading_states FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM community_members cm_me
      JOIN community_members cm_target ON cm_me.community_id = cm_target.community_id
      WHERE cm_me.user_id = auth.uid()
      AND cm_target.user_id = reading_states.user_id
      AND cm_me.status = 'accepted'
      AND cm_target.status = 'accepted'
    )
  );
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

-- NEW: Policy to allow viewing reading progresses of fellow community members
CREATE POLICY "Community members can view each other's reading progresses"
  ON reading_progresses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM community_members cm_me
      JOIN community_members cm_target ON cm_me.community_id = cm_target.community_id
      WHERE cm_me.user_id = auth.uid()
      AND cm_target.user_id = reading_progresses.user_id
      AND cm_me.status = 'accepted'
      AND cm_target.status = 'accepted'
    )
  );
```

### 4. communities table

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

### 5. community_members table

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

### 6. profiles table

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

- **Profiles**: Added to allow displaying user names/avatars in communities.
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
