-- Reading Progress History Table
-- Stores snapshots of reading progress to enable statistics tracking

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
