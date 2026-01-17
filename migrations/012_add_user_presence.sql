-- Add presence tracking columns to profiles table
-- last_seen: timestamp of last activity (updated every ~30 seconds)
-- status: current activity status ('online', 'reading', 'offline')

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'offline';

-- Index for efficient online user queries
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON profiles(last_seen);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);

-- Update RLS policy to allow users to update their own presence
-- (existing policy "Users can update own profile" should cover this)
