-- Migration: Update profile trigger to upsert avatar_url from OAuth providers
-- This migration fixes the issue where Google OAuth profile pictures aren't saved to the profiles table

-- Step 1: Update the trigger function to UPSERT instead of just INSERT
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    email = COALESCE(EXCLUDED.email, profiles.email),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Backfill existing profiles with avatar URLs from auth.users metadata
-- This updates any existing profiles that are missing avatar_url
UPDATE public.profiles
SET 
  avatar_url = COALESCE(
    auth.users.raw_user_meta_data->>'avatar_url',
    auth.users.raw_user_meta_data->>'picture'
  ),
  updated_at = NOW()
FROM auth.users
WHERE profiles.id = auth.users.id
  AND profiles.avatar_url IS NULL
  AND (
    auth.users.raw_user_meta_data->>'avatar_url' IS NOT NULL
    OR auth.users.raw_user_meta_data->>'picture' IS NOT NULL
  );

-- Step 3: Verify the trigger is still active (it should be)
-- If you need to recreate the trigger:
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
