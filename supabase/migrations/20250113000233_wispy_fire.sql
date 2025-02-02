-- Drop existing table and related objects if they exist
DROP TRIGGER IF EXISTS handle_active_template ON templates;
DROP FUNCTION IF EXISTS set_active_template();
DROP TABLE IF EXISTS templates CASCADE;

-- Create templates table
CREATE TABLE templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  canvas_data jsonb NOT NULL,
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
USING (user_id = auth.uid());

CREATE POLICY "templates_insert_policy"
ON templates FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "templates_update_policy"
ON templates FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "templates_delete_policy"
ON templates FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Function to handle setting active template
CREATE OR REPLACE FUNCTION set_active_template()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active THEN
    -- Set all other templates to inactive
    UPDATE templates
    SET is_active = false
    WHERE user_id = NEW.user_id
    AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for active template management
CREATE TRIGGER handle_active_template
  BEFORE INSERT OR UPDATE OF is_active ON templates
  FOR EACH ROW
  EXECUTE FUNCTION set_active_template();