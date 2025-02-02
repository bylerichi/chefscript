/*
  # Add token tracking system

  1. Changes
    - Add token deduction triggers for recipes and styles
    - Add token check functions to prevent actions when tokens are insufficient
*/

-- Create function to check if user has enough tokens
CREATE OR REPLACE FUNCTION check_user_tokens(required_tokens integer)
RETURNS boolean AS $$
DECLARE
  user_tokens integer;
BEGIN
  SELECT tokens INTO user_tokens
  FROM users
  WHERE id = auth.uid();
  
  RETURN COALESCE(user_tokens, 0) >= required_tokens;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to deduct tokens
CREATE OR REPLACE FUNCTION deduct_user_tokens(amount integer)
RETURNS void AS $$
BEGIN
  UPDATE users
  SET tokens = tokens - amount
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger function for recipe creation
CREATE OR REPLACE FUNCTION handle_recipe_tokens()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT check_user_tokens(2) THEN
    RAISE EXCEPTION 'Insufficient tokens. Recipe generation requires 2 tokens.';
  END IF;
  
  PERFORM deduct_user_tokens(2);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger function for style creation
CREATE OR REPLACE FUNCTION handle_style_tokens()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT check_user_tokens(10) THEN
    RAISE EXCEPTION 'Insufficient tokens. Style creation requires 10 tokens.';
  END IF;
  
  PERFORM deduct_user_tokens(10);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
DROP TRIGGER IF EXISTS recipe_tokens_trigger ON recipes;
CREATE TRIGGER recipe_tokens_trigger
  BEFORE INSERT ON recipes
  FOR EACH ROW
  EXECUTE FUNCTION handle_recipe_tokens();

DROP TRIGGER IF EXISTS style_tokens_trigger ON styles;
CREATE TRIGGER style_tokens_trigger
  BEFORE INSERT ON styles
  FOR EACH ROW
  EXECUTE FUNCTION handle_style_tokens();