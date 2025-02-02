/*
  # Update styles table schema

  1. Changes
    - Add thumbnail_url column to styles table
    - Add RLS policies for thumbnail updates
    - Drop and recreate all style policies for consistency

  2. Security
    - Enable RLS on styles table
    - Add policies for CRUD operations
    - Ensure users can only manage their own styles
*/

-- Drop existing policies
DO $$
BEGIN
  DROP POLICY IF EXISTS "styles_select_policy" ON styles;
  DROP POLICY IF EXISTS "styles_insert_policy" ON styles;
  DROP POLICY IF EXISTS "styles_update_policy" ON styles;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

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

-- Recreate all policies
CREATE POLICY "styles_select_policy"
ON styles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "styles_insert_policy"
ON styles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "styles_update_policy"
ON styles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Ensure RLS is enabled
ALTER TABLE styles ENABLE ROW LEVEL SECURITY;