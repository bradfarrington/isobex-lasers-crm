-- Phone Number Management System
-- Provides landline number provisioning, call forwarding, recording, voicemail, and usage tracking

-- 0. Add stripe_customer_id to business_profile for subscription management
ALTER TABLE public.business_profile
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- 1. phone_numbers — Core table for provisioned numbers
CREATE TABLE public.phone_numbers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL UNIQUE,                -- E.164 format e.g. +441827214455
  friendly_name TEXT DEFAULT '',                     -- User label e.g. "Office Landline"
  twilio_sid TEXT,                                   -- Twilio PN... SID
  number_type TEXT DEFAULT 'local',                  -- local, mobile, toll_free
  capabilities JSONB DEFAULT '{"voice":true,"sms":true,"mms":false}'::jsonb,
  status TEXT DEFAULT 'active',                      -- active, suspended, released, porting
  -- Call forwarding
  forward_to TEXT,                                   -- E.164 number to forward calls to
  forward_enabled BOOLEAN DEFAULT false,
  -- Voicemail
  voicemail_enabled BOOLEAN DEFAULT false,
  voicemail_greeting_url TEXT,                       -- Custom greeting recording URL
  -- Call recording
  recording_enabled BOOLEAN DEFAULT false,
  -- Billing
  monthly_cost_pence INTEGER DEFAULT 300,            -- £3.00/month default
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  next_billing_date TIMESTAMPTZ,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. phone_call_logs — Every call logged via Twilio status callback
CREATE TABLE public.phone_call_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number_id UUID REFERENCES public.phone_numbers(id) ON DELETE CASCADE,
  direction TEXT NOT NULL,                           -- inbound, outbound
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  status TEXT DEFAULT 'initiated',                   -- initiated, ringing, in-progress, completed, busy, no-answer, canceled, failed
  duration_seconds INTEGER DEFAULT 0,
  cost_pence INTEGER DEFAULT 0,                      -- Platform cost charged to client
  twilio_call_sid TEXT,
  recording_url TEXT,                                -- Recording URL if enabled
  recording_duration_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. phone_usage_summary — Monthly aggregates for billing display
CREATE TABLE public.phone_usage_summary (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number_id UUID REFERENCES public.phone_numbers(id) ON DELETE CASCADE,
  month DATE NOT NULL,                               -- First of month e.g. 2026-04-01
  total_calls INTEGER DEFAULT 0,
  total_duration_seconds INTEGER DEFAULT 0,
  total_cost_pence INTEGER DEFAULT 0,
  inbound_calls INTEGER DEFAULT 0,
  outbound_calls INTEGER DEFAULT 0,
  UNIQUE(phone_number_id, month)
);

-- RLS
ALTER TABLE public.phone_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_usage_summary ENABLE ROW LEVEL SECURITY;

-- phone_numbers: authenticated users can read and update
CREATE POLICY "phone_numbers_select" ON public.phone_numbers FOR SELECT TO authenticated USING (true);
CREATE POLICY "phone_numbers_insert" ON public.phone_numbers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "phone_numbers_update" ON public.phone_numbers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "phone_numbers_delete" ON public.phone_numbers FOR DELETE TO authenticated USING (true);

-- phone_call_logs: read + insert
CREATE POLICY "phone_call_logs_select" ON public.phone_call_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "phone_call_logs_insert" ON public.phone_call_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "phone_call_logs_update" ON public.phone_call_logs FOR UPDATE TO authenticated USING (true);

-- phone_usage_summary: read + upsert
CREATE POLICY "phone_usage_summary_select" ON public.phone_usage_summary FOR SELECT TO authenticated USING (true);
CREATE POLICY "phone_usage_summary_insert" ON public.phone_usage_summary FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "phone_usage_summary_update" ON public.phone_usage_summary FOR UPDATE TO authenticated USING (true);

-- Index for fast call log lookups
CREATE INDEX idx_phone_call_logs_number ON public.phone_call_logs(phone_number_id);
CREATE INDEX idx_phone_call_logs_created ON public.phone_call_logs(created_at DESC);
CREATE INDEX idx_phone_usage_month ON public.phone_usage_summary(phone_number_id, month);
