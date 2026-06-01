-- ============================================================
-- Add verify_password RPC function for bcrypt verification
-- ============================================================

-- Create the verify_password function
CREATE OR REPLACE FUNCTION verify_password(plain TEXT, hashed TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
IMMUTABLE
STRICT
AS $$
  SELECT hashed = crypt(plain, hashed)
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION verify_password(TEXT, TEXT) TO authenticated;

-- Also grant to anon in case needed for public endpoints
GRANT EXECUTE ON FUNCTION verify_password(TEXT, TEXT) TO anon;
