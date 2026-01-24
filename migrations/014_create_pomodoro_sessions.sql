-- Create pomodoro_sessions table to track timer usage
-- Each session can optionally be linked to a book the user is reading

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

-- Indexes for efficient querying
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

-- Policy: Users can delete their own pomodoro sessions
CREATE POLICY "Users can delete their own pomodoro sessions"
  ON pomodoro_sessions FOR DELETE
  USING (auth.uid() = user_id);
