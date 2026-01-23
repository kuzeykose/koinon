-- Migration: Add online status preference to profiles
-- This allows users to control whether they appear online to others

-- Add the preference column (default true = show online status)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS show_online_status BOOLEAN DEFAULT true;

-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_profiles_show_online_status ON profiles(show_online_status);

-- Comment explaining the field
COMMENT ON COLUMN profiles.show_online_status IS 'User preference: whether to show online status to others. When false, user always appears offline.';
