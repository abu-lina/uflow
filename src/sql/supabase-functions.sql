-- Function to get the current timestamp
-- Run this SQL in your Supabase SQL editor
CREATE OR REPLACE FUNCTION get_current_timestamp()
RETURNS TIMESTAMPTZ AS $$
  BEGIN
    RETURN NOW();
  END;
$$ LANGUAGE plpgsql; 