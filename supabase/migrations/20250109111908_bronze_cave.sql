/*
  # Add token purchase function
  
  1. New Functions
    - `add_tokens`: Securely adds tokens to a user's account
      - Parameters:
        - token_amount (integer): Number of tokens to add
      - Security: SECURITY DEFINER to run with elevated privileges
      - Returns: void
  
  2. Security
    - Function can only be called by authenticated users
    - Uses auth.uid() to ensure users can only modify their own tokens
*/

-- Create function to add tokens
CREATE OR REPLACE FUNCTION add_tokens(token_amount integer)
RETURNS void AS $$
BEGIN
  -- Validate input
  IF token_amount <= 0 THEN
    RAISE EXCEPTION 'Token amount must be positive';
  END IF;

  -- Update user's tokens
  UPDATE users
  SET tokens = tokens + token_amount
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;