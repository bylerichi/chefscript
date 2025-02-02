-- Drop existing objects
DROP TRIGGER IF EXISTS handle_active_template ON templates;
DROP FUNCTION IF EXISTS set_active_template();
DROP TABLE IF EXISTS templates CASCADE;

-- Create templates table with minimal schema
CREATE TABLE templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  canvas_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

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