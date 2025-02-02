/*
  # Update recipes table policies

  1. Changes
    - Drop existing policies before recreating them
    - Add user_id column if missing
    - Update RLS policies with proper checks

  2. Security
    - Enable RLS
    - Add policies for authenticated users
    - Add trigger for automatic user_id setting
*/

-- Add user_id if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'recipes' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE recipes ADD COLUMN user_id uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can read own recipes" ON recipes;
  DROP POLICY IF EXISTS "Users can insert own recipes" ON recipes;
  DROP POLICY IF EXISTS "Users can create own recipes" ON recipes;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create new policies
CREATE POLICY "recipes_select_policy"
ON recipes FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "recipes_insert_policy"
ON recipes FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id OR user_id IS NULL
);

-- Create function to set user_id
CREATE OR REPLACE FUNCTION public.set_recipe_user_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_id := auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS set_recipe_user_id ON recipes;
CREATE TRIGGER set_recipe_user_id
  BEFORE INSERT ON recipes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_recipe_user_id();