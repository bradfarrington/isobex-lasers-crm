-- Add is_test column to orders (in case it doesn't intuitively exist)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

-- Create a secure RPC function so the CRM dashboard can aggregate order revenue without exposing raw PII to the anon key
CREATE OR REPLACE FUNCTION get_analytics_orders(start_dt timestamptz)
RETURNS TABLE (
  id uuid,
  created_at timestamptz,
  total numeric,
  is_test boolean
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT id, created_at, total, COALESCE(is_test, false) as is_test 
  FROM orders 
  WHERE created_at >= start_dt AND status != 'cancelled';
$$;
