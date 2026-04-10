-- ============================================================================
-- MIGRATION: Fix missing RLS policies for tables not covered by initial migration
-- Date: 2026-04-10 (follow-up)
-- Purpose: Add authenticated access policies to tables that were missed,
--          and enable RLS on campaign_scheduler_config.
-- ============================================================================

-- ─── Enable RLS on the one remaining table ────────────────────────────────────
ALTER TABLE public.campaign_scheduler_config ENABLE ROW LEVEL SECURITY;

-- ─── Authenticated full-access policies for all missed tables ─────────────────

CREATE POLICY "auth_all_business_profile" ON public.business_profile
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "auth_all_campaign_scheduler_config" ON public.campaign_scheduler_config
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "auth_all_excluded_ips" ON public.excluded_ips
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "auth_all_leads" ON public.leads
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "auth_all_phone_call_logs" ON public.phone_call_logs
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "auth_all_phone_numbers" ON public.phone_numbers
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "auth_all_phone_usage_summary" ON public.phone_usage_summary
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "auth_all_sms_credit_purchases" ON public.sms_credit_purchases
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "auth_all_sms_log" ON public.sms_log
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "auth_all_sms_templates" ON public.sms_templates
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "auth_all_smtp_settings" ON public.smtp_settings
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "auth_all_stripe_settings" ON public.stripe_settings
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- DONE! Run the verification query again to confirm all tables show true:
--
--   SELECT tablename, rowsecurity
--   FROM pg_tables
--   WHERE schemaname = 'public'
--   ORDER BY tablename;
-- ============================================================================
