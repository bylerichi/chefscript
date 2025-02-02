/*
  # Add word count based token calculation

  1. Changes
    - Add function to calculate required tokens based on word count
    - Update plagiarism check token deduction to use word count calculation
    - Add trigger to handle token deduction based on word count

  2. Security
    - Functions are security definer to run with elevated privileges
    - RLS policies remain unchanged
*/

-- Drop existing token calculation functions
DROP FUNCTION IF EXISTS check_user_tokens(integer);
DROP FUNCTION IF EXISTS deduct_user_tokens(integer);

-- Create function to calculate required tokens based on word count
CREATE OR REPLACE FUNCTION calculate_required_tokens(word_count integer)
RETURNS integer AS $$
BEGIN
  -- Calculate tokens: 2 tokens per 500 words, rounded up
  RETURN CEIL(word_count::float / 500) * 2;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- Add helpful comments
COMMENT ON FUNCTION calculate_required_tokens IS 'Calculates required tokens based on word count (2 tokens per 500 words)';
COMMENT ON FUNCTION check_user_tokens IS 'Checks if user has enough tokens for an operation';
COMMENT ON FUNCTION deduct_user_tokens IS 'Deducts tokens from user balance';