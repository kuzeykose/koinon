-- Add is_public column to profiles table
ALTER TABLE profiles ADD COLUMN is_public BOOLEAN DEFAULT true;

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
