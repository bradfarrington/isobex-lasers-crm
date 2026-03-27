-- SMS integration tables and profile updates

-- 1. Add fields to business_profile
ALTER TABLE public.business_profile
  ADD COLUMN sms_enabled BOOLEAN DEFAULT false,
  ADD COLUMN sms_sender_name TEXT,
  ADD COLUMN sms_from_number TEXT,
  ADD COLUMN sms_credits_balance INTEGER DEFAULT 0,
  ADD COLUMN sms_low_credit_notified BOOLEAN DEFAULT false;

-- 2. sms_templates table
CREATE TABLE public.sms_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  system_key TEXT, -- e.g., 'order_confirmation', 'order_refunded'
  body TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(system_key)
);

-- Insert default system templates
INSERT INTO public.sms_templates (name, system_key, body) VALUES 
('Order Confirmation', 'order_confirmation', 'Hi {{customer_name}}, thank you for your order ({{order_number}}) with {{business_name}}! It is now being processed.'),
('Refund Processed', 'order_refunded', 'Hi {{customer_name}}, a refund for your order ({{order_number}}) from {{business_name}} has been processed.');

-- 3. sms_log table
CREATE TABLE public.sms_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  recipient_phone TEXT NOT NULL,
  message_body TEXT NOT NULL,
  twilio_sid TEXT,
  status TEXT NOT NULL,
  credits_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. sms_credit_purchases table
CREATE TABLE public.sms_credit_purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  credits_purchased INTEGER NOT NULL,
  amount_paid_pence INTEGER NOT NULL,
  stripe_session_id TEXT,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for new tables
ALTER TABLE public.sms_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_credit_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to authenticated users" ON public.sms_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all access to authenticated users" ON public.sms_templates FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow read access to authenticated users" ON public.sms_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert access to authenticated users" ON public.sms_log FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow read access to authenticated users" ON public.sms_credit_purchases FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert access to authenticated users" ON public.sms_credit_purchases FOR INSERT TO authenticated WITH CHECK (true);
