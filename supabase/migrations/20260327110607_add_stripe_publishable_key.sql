CREATE TABLE IF NOT EXISTS public.stripe_settings (
  id uuid primary key default gen_random_uuid(),
  stripe_publishable_key text,
  stripe_secret_key text,
  stripe_webhook_secret text,
  stripe_configured boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
ALTER TABLE public.stripe_settings ENABLE ROW LEVEL SECURITY;

-- Allow read/write for authenticated users only
CREATE POLICY "Allow read access to authenticated users" ON public.stripe_settings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow update access to authenticated users" ON public.stripe_settings
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow insert access to authenticated users" ON public.stripe_settings
  FOR INSERT TO authenticated WITH CHECK (true);

-- Create an RPC to safely fetch the publishable key without exposing the secret key
CREATE OR REPLACE FUNCTION public.get_stripe_publishable_key()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pk text;
BEGIN
  SELECT stripe_publishable_key INTO pk
  FROM stripe_settings
  LIMIT 1;
  
  RETURN pk;
END;
$$;

-- Grant execute securely
GRANT EXECUTE ON FUNCTION public.get_stripe_publishable_key() TO anon, authenticated;
