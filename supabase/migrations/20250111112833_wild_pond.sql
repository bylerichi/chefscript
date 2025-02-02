/*
  # Token Management System Update

  1. Changes
    - Update token cost for recipe generation to 1 token
    - Update token cost for style creation to 2 tokens
    - Improve token management functions and triggers

  2. Security
    - All functions are SECURITY DEFINER to run with elevated privileges
    - Proper error handling for insufficient tokens
*/

-- Drop existing functions and triggers if they exist
DROP TRIGGER IF EXISTS recipe_tokens_trigger ON recipes;
DROP TRIGGER IF EXISTS style_tokens_trigger ON styles;
DROP FUNCTION IF EXISTS handle_recipe_tokens();
DROP FUNCTION IF EXISTS handle_style_tokens();
DROP FUNCTION IF EXISTS check_user_tokens(integer);
DROP FUNCTION IF EXISTS deduct_user_tokens(integer);

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

-- Create trigger function for recipe creation (1 token)
CREATE OR REPLACE FUNCTION handle_recipe_tokens()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT check_user_tokens(1) THEN
    RAISE EXCEPTION 'Insufficient tokens. Recipe generation requires 1 token.';
  END IF;
  
  PERFORM deduct_user_tokens(1);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger function for style creation (2 tokens)
CREATE OR REPLACE FUNCTION handle_style_tokens()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT check_user_tokens(2) THEN
    RAISE EXCEPTION 'Insufficient tokens. Style creation requires 2 tokens.';
  END IF;
  
  PERFORM deduct_user_tokens(2);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
CREATE TRIGGER recipe_tokens_trigger
  BEFORE INSERT ON recipes
  FOR EACH ROW
  EXECUTE FUNCTION handle_recipe_tokens();

CREATE TRIGGER style_tokens_trigger
  BEFORE INSERT ON styles
  FOR EACH ROW
  EXECUTE FUNCTION handle_style_tokens();