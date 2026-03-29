-- Contact Communications log table
-- Stores individual transactional emails and SMS sent to contacts

CREATE TABLE IF NOT EXISTS public.contact_communications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,          -- 'email' | 'sms'
  comm_type TEXT NOT NULL,        -- 'order_confirmation' | 'refund_confirmation' | 'gift_card' | 'review_request' | 'sms_order_confirmation' | 'sms_order_refunded'
  subject TEXT,                   -- email subject line (null for SMS)
  body_preview TEXT,              -- first ~200 chars or SMS body
  recipient TEXT NOT NULL,        -- email address or phone number
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'sent',     -- 'sent' | 'failed'
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE public.contact_communications ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read
CREATE POLICY "Allow read access to authenticated users"
  ON public.contact_communications FOR SELECT TO authenticated USING (true);

-- Service role inserts (edge functions use service role key)
CREATE POLICY "Allow insert for service role"
  ON public.contact_communications FOR INSERT TO service_role WITH CHECK (true);

-- Also allow authenticated inserts (for any future client-side logging)
CREATE POLICY "Allow insert for authenticated users"
  ON public.contact_communications FOR INSERT TO authenticated WITH CHECK (true);

-- Index for fast lookups by contact
CREATE INDEX idx_contact_communications_contact_id ON public.contact_communications(contact_id);
