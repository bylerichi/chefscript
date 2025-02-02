/*
  # Add custom_style_id to styles table

  1. Changes
    - Add custom_style_id column to styles table if it doesn't exist
  
  2. Notes
    - Uses IF NOT EXISTS check to avoid errors if column already exists
    - Safe to run multiple times
*/

DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'styles' AND column_name = 'custom_style_id'
  ) THEN
    ALTER TABLE styles ADD COLUMN custom_style_id text;
  END IF;
END $$;