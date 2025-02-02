/*
  # Update styles table schema
  
  1. Changes
    - Add thumbnail_url column
    - Preserve existing data
    - Handle foreign key constraints safely
  
  2. Security
    - Maintain RLS policies
    - Ensure proper access control
*/

-- First, drop the foreign key constraint from recipes
ALTER TABLE recipes DROP CONSTRAINT IF EXISTS recipes_style_id_fkey;

-- Create new styles table
CREATE TABLE IF NOT EXISTS styles_new (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  base_style text NOT NULL,
  custom_style_id text,
  thumbnail_url text,
  created_at timestamptz DEFAULT now()
);

-- Copy data if old table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'styles') THEN
    INSERT INTO styles_new (id, user_id, name, base_style, custom_style_id, created_at)
    SELECT id, user_id, name, base_style, custom_style_id, created_at
    FROM styles;
  END IF;
END $$;

-- Drop old table and rename new one
DROP TABLE IF EXISTS styles;
ALTER TABLE styles_new RENAME TO styles;

-- Recreate the foreign key constraint on recipes
ALTER TABLE recipes
  ADD CONSTRAINT recipes_style_id_fkey
  FOREIGN KEY (style_id)
  REFERENCES styles(id)
  ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE styles ENABLE ROW LEVEL SECURITY;

-- Recreate policies
DO $$
BEGIN
  DROP POLICY IF EXISTS "styles_select_policy" ON styles;
  DROP POLICY IF EXISTS "styles_insert_policy" ON styles;
  DROP POLICY IF EXISTS "styles_update_policy" ON styles;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

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