-- Drop existing objects
DROP TABLE IF EXISTS templates CASCADE;

-- Create templates table with consistent schema
CREATE TABLE templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  name text NOT NULL,
  canvas_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Add template columns to recipes if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'recipes' AND column_name = 'template_id'
  ) THEN
    ALTER TABLE recipes ADD COLUMN template_id uuid REFERENCES templates(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'recipes' AND column_name = 'template_applied'
  ) THEN
    ALTER TABLE recipes ADD COLUMN template_applied boolean DEFAULT false;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "templates_select_policy"
ON templates FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "templates_insert_policy"
ON templates FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "templates_update_policy"
ON templates FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "templates_delete_policy"
ON templates FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON templates TO authenticated;