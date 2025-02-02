-- Drop existing objects if they exist
DROP TRIGGER IF EXISTS handle_active_template ON templates;
DROP FUNCTION IF EXISTS set_active_template();
DROP TABLE IF EXISTS templates CASCADE;

-- Create templates table with explicit column definitions
CREATE TABLE templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  canvas_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT templates_name_not_empty CHECK (length(trim(name)) > 0)
);

-- Enable RLS
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Create policies with simplified conditions
CREATE POLICY "templates_select_policy"
ON templates FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

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

-- Function to handle setting active template
CREATE OR REPLACE FUNCTION set_active_template()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active THEN
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

-- Grant explicit permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON templates TO authenticated;
GRANT EXECUTE ON FUNCTION set_active_template TO authenticated;