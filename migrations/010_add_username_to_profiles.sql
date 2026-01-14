-- Migration: Add username column to profiles table
-- Usernames are auto-generated from email prefix on signup

-- Step 1: Add username column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT;

-- Step 2: Create unique index for username
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- Step 3: Create helper function to generate unique username from email
CREATE OR REPLACE FUNCTION generate_unique_username(base_username TEXT)
RETURNS TEXT AS $$
DECLARE
  final_username TEXT;
  suffix TEXT;
  counter INT := 0;
BEGIN
  -- Clean the base username: lowercase, replace non-alphanumeric with underscore
  final_username := LOWER(REGEXP_REPLACE(base_username, '[^a-zA-Z0-9]', '_', 'g'));
  
  -- Remove leading/trailing underscores and collapse multiple underscores
  final_username := TRIM(BOTH '_' FROM REGEXP_REPLACE(final_username, '_+', '_', 'g'));
  
  -- Ensure minimum length of 3 characters
  IF LENGTH(final_username) < 3 THEN
    final_username := final_username || '_user';
  END IF;
  
  -- Truncate to max 25 chars to leave room for suffix
  final_username := LEFT(final_username, 25);
  
  -- Check if username exists, if so add random suffix
  WHILE EXISTS (SELECT 1 FROM profiles WHERE username = final_username) LOOP
    suffix := LOWER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));
    final_username := LEFT(REGEXP_REPLACE(LOWER(REGEXP_REPLACE(base_username, '[^a-zA-Z0-9]', '_', 'g')), '_+', '_', 'g'), 25) || '_' || suffix;
    counter := counter + 1;
    IF counter > 100 THEN
      -- Fallback to UUID-based username if too many collisions
      final_username := 'user_' || LOWER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
      EXIT;
    END IF;
  END LOOP;
  
  RETURN final_username;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Backfill existing profiles with username from email prefix
DO $$
DECLARE
  profile_record RECORD;
  new_username TEXT;
BEGIN
  FOR profile_record IN 
    SELECT id, email FROM profiles WHERE username IS NULL AND email IS NOT NULL
  LOOP
    new_username := generate_unique_username(SPLIT_PART(profile_record.email, '@', 1));
    UPDATE profiles SET username = new_username WHERE id = profile_record.id;
  END LOOP;
END $$;

-- Step 5: Update the handle_new_user trigger function to include username generation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  generated_username TEXT;
BEGIN
  -- Generate username from email prefix
  generated_username := generate_unique_username(SPLIT_PART(NEW.email, '@', 1));
  
  INSERT INTO public.profiles (id, full_name, email, avatar_url, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
    generated_username
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    email = COALESCE(EXCLUDED.email, profiles.email),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
    username = COALESCE(profiles.username, EXCLUDED.username),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: The trigger on_auth_user_created should already exist from previous migrations
-- If it doesn't exist, uncomment the following:
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
