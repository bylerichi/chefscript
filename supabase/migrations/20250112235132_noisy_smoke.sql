/*
  # Add template system

  1. New Tables
    - `templates`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users)
      - `name` (text)
      - `canvas_data` (jsonb)
      - `is_active` (boolean)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `templates` table
    - Add policies for authenticated users
*/

-- Create templates table
CREATE TABLE IF NOT EXISTS templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  canvas_data jsonb NOT NULL,
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

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