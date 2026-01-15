-- Add statistics privacy column to profiles
-- This allows users to independently control visibility of their statistics

ALTER TABLE profiles ADD COLUMN is_stats_public BOOLEAN DEFAULT false;

-- Update existing profiles to have stats private by default
UPDATE profiles SET is_stats_public = false WHERE is_stats_public IS NULL;
