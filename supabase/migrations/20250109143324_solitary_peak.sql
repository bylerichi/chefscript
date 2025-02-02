/*
  # Add thumbnail URL to styles

  1. Changes
    - Add thumbnail_url column to styles table
*/

DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'styles' AND column_name = 'thumbnail_url'
  ) THEN
    ALTER TABLE styles ADD COLUMN thumbnail_url text;
  END IF;
END $$;