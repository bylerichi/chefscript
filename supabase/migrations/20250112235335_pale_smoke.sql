/*
  # Add template support to recipes

  1. Changes
    - Add template_id column to recipes table
    - Add foreign key constraint to templates table

  2. Security
    - Update RLS policies to allow template access
*/

-- Add template_id to recipes
ALTER TABLE recipes 
ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES templates(id) ON DELETE SET NULL;

-- Add template_applied column
ALTER TABLE recipes
ADD COLUMN IF NOT EXISTS template_applied boolean DEFAULT false;