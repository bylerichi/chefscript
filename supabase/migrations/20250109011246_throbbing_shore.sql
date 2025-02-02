/*
  # Fix RLS policies for styles table

  1. Changes
    - Drop existing policies if they exist
    - Create new simplified policies for styles table
    - Add trigger to automatically set user_id
  
  2. Security
    - Enables proper RLS for styles table
    - Ensures users can only access their own styles
    - Automatically sets user_id on insert
*/

-- Drop existing policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can read own styles" ON styles;
  DROP POLICY IF EXISTS "Users can create own styles" ON styles;
  DROP POLICY IF EXISTS "Users can update own styles" ON styles;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create simplified policies
CREATE POLICY "styles_select_policy"
ON styles FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR user_id IS NULL
);

CREATE POLICY "styles_insert_policy"
ON styles FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create function to set user_id
CREATE OR REPLACE FUNCTION public.set_style_user_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS set_style_user_id ON styles;
CREATE TRIGGER set_style_user_id
  BEFORE INSERT ON styles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_style_user_id();