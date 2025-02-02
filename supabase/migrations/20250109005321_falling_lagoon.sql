/*
  # Fix RLS policies for recipes table

  1. Changes
    - Simplify RLS policies
    - Make insert policy more permissive
    - Ensure user_id is set correctly

  2. Security
    - Maintain RLS protection
    - Allow authenticated users to insert with null user_id
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
USING (
  user_id = auth.uid() OR user_id IS NULL
);

CREATE POLICY "recipes_insert_policy"
ON recipes FOR INSERT
TO authenticated
WITH CHECK (true);

-- Update trigger function to handle user_id
CREATE OR REPLACE FUNCTION public.set_recipe_user_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;