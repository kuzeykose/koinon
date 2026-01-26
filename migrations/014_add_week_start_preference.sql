-- Add week_start_day preference to profiles table
-- Valid values: 'monday', 'sunday'
-- Default: 'monday'
-- Note: These values must match WEEK_START_DAYS constant in lib/constants.ts

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS week_start_day TEXT DEFAULT 'monday';

-- Add check constraint to ensure valid values
-- If you need to add/remove values, update both this constraint and lib/constants.ts
ALTER TABLE profiles ADD CONSTRAINT check_week_start_day 
  CHECK (week_start_day IN ('monday', 'sunday'));

-- Update existing profiles to use Monday as default
UPDATE profiles SET week_start_day = 'monday' WHERE week_start_day IS NULL;
