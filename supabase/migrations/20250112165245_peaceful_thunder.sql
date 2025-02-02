/*
  # Add custom_style_id column to styles table
  
  1. Changes
    - Add custom_style_id column to styles table if it doesn't exist
  
  2. Notes
    - Uses safe column addition with IF NOT EXISTS check
    - No data migration needed as this is a new column
*/

-- Create extension if it doesn't exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add custom_style_id column safely
ALTER TABLE styles 
ADD COLUMN IF NOT EXISTS custom_style_id text;

-- Add comment to column
COMMENT ON COLUMN styles.custom_style_id IS 'Identifier for the custom style from the image generation service';