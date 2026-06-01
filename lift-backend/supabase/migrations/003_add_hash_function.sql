-- ============================================================
-- Add hash_password RPC function for bcrypt hashing
-- ============================================================

-- Create the hash_password function that uses pgcrypto
CREATE OR REPLACE FUNCTION hash_password(plain TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
STRICT
AS $$
  SELECT crypt(plain, gen_salt('bf', 10))
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION hash_password(TEXT) TO authenticated;

-- Also grant to anon in case needed for public endpoints
GRANT EXECUTE ON FUNCTION hash_password(TEXT) TO anon;
