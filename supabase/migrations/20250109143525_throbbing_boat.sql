/*
  # Add thumbnail URL to styles table

  1. Changes
    - Add thumbnail_url column to styles table for storing preview images
*/

-- Add thumbnail_url column if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'styles' AND column_name = 'thumbnail_url'
  ) THEN
    ALTER TABLE styles ADD COLUMN thumbnail_url text;
  END IF;
END $$;

-- Ensure RLS policies allow updating thumbnail_url
DO $$
BEGIN
  -- Drop existing update policy if it exists
  DROP POLICY IF EXISTS "styles_update_policy" ON styles;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create update policy for thumbnail_url
CREATE POLICY "styles_update_policy"
ON styles FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());