/*
  # Fix User Data Isolation

  1. Changes
    - Update RLS policies for styles to only show user's own styles
    - Set default token count for new users to 100
    - Ensure proper user data isolation

  2. Security
    - Strict RLS policies to prevent data leakage between users
    - Proper initialization of new user accounts
*/

-- Drop existing policies for styles
DO $$
BEGIN
  DROP POLICY IF EXISTS "styles_select_policy" ON styles;
  DROP POLICY IF EXISTS "styles_insert_policy" ON styles;
  DROP POLICY IF EXISTS "styles_update_policy" ON styles;
  DROP POLICY IF EXISTS "styles_delete_policy" ON styles;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create new restrictive policies for styles
CREATE POLICY "styles_select_policy"
ON styles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "styles_insert_policy"
ON styles FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "styles_update_policy"
ON styles FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "styles_delete_policy"
ON styles FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Update handle_new_user function to set initial token count
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, tokens)
  VALUES (new.id, new.email, 100);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;