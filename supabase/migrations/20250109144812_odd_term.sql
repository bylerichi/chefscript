/*
  # Add delete policy for styles

  1. Changes
    - Add RLS policy to allow users to delete their own styles
*/

-- Create delete policy for styles
DO $$
BEGIN
  DROP POLICY IF EXISTS "styles_delete_policy" ON styles;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "styles_delete_policy"
ON styles FOR DELETE
TO authenticated
USING (auth.uid() = user_id);