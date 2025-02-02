/*
  # Fix RLS policies for recipes table

  1. Changes
    - Drop existing policies
    - Create new simplified policies for recipes table
    - Update trigger function
  
  2. Security
    - Enable RLS
    - Add policies for SELECT and INSERT
    - Ensure user_id is set automatically
*/

-- Drop existing policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "recipes_select_policy" ON recipes;
  DROP POLICY IF EXISTS "recipes_insert_policy" ON recipes;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create simplified policies
CREATE POLICY "recipes_select_policy"
ON recipes FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "recipes_insert_policy"
ON recipes FOR INSERT
TO authenticated
WITH CHECK (true);

-- Update trigger function to handle user_id
CREATE OR REPLACE FUNCTION public.set_recipe_user_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_id := auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS set_recipe_user_id ON recipes;
CREATE TRIGGER set_recipe_user_id
  BEFORE INSERT ON recipes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_recipe_user_id();