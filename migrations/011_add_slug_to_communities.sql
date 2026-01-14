-- Migration: Add slug column to communities table
-- Slugs are auto-generated from community name using kebab-case

-- Step 1: Add slug column
ALTER TABLE communities ADD COLUMN IF NOT EXISTS slug TEXT;

-- Step 2: Create unique index for slug
CREATE UNIQUE INDEX IF NOT EXISTS idx_communities_slug ON communities(slug);

-- Step 3: Create helper function to generate unique slug from name
CREATE OR REPLACE FUNCTION generate_unique_community_slug(base_name TEXT)
RETURNS TEXT AS $$
DECLARE
  final_slug TEXT;
  suffix TEXT;
  counter INT := 0;
BEGIN
  -- Clean the base name: lowercase, replace non-alphanumeric with hyphen
  final_slug := LOWER(REGEXP_REPLACE(base_name, '[^a-zA-Z0-9]', '-', 'g'));
  
  -- Remove leading/trailing hyphens and collapse multiple hyphens
  final_slug := TRIM(BOTH '-' FROM REGEXP_REPLACE(final_slug, '-+', '-', 'g'));
  
  -- Ensure minimum length of 2 characters
  IF LENGTH(final_slug) < 2 THEN
    final_slug := final_slug || '-community';
  END IF;
  
  -- Truncate to max 45 chars to leave room for suffix
  final_slug := LEFT(final_slug, 45);
  
  -- Check if slug exists, if so add random suffix
  WHILE EXISTS (SELECT 1 FROM communities WHERE slug = final_slug) LOOP
    suffix := LOWER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));
    final_slug := LEFT(TRIM(BOTH '-' FROM REGEXP_REPLACE(LOWER(REGEXP_REPLACE(base_name, '[^a-zA-Z0-9]', '-', 'g')), '-+', '-', 'g')), 45) || '-' || suffix;
    counter := counter + 1;
    IF counter > 100 THEN
      -- Fallback to UUID-based slug if too many collisions
      final_slug := 'community-' || LOWER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
      EXIT;
    END IF;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Backfill existing communities with slug from name
DO $$
DECLARE
  community_record RECORD;
  new_slug TEXT;
BEGIN
  FOR community_record IN 
    SELECT id, name FROM communities WHERE slug IS NULL AND name IS NOT NULL
  LOOP
    new_slug := generate_unique_community_slug(community_record.name);
    UPDATE communities SET slug = new_slug WHERE id = community_record.id;
  END LOOP;
END $$;
