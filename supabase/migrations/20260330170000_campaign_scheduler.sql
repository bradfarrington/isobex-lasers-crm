-- ═══════════════════════════════════════════════════════════
-- Campaign Scheduler: pg_cron + pg_net
--
-- Runs every minute to check for scheduled campaigns that are
-- due and triggers the send-email Edge Function for each one.
-- ═══════════════════════════════════════════════════════════

-- Enable required extensions (already available on Supabase)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ─── Config table for scheduler secrets ──────────────────
CREATE TABLE IF NOT EXISTS campaign_scheduler_config (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),  -- singleton row
  supabase_url TEXT NOT NULL,
  service_role_key TEXT NOT NULL
);

-- Insert config (update the service_role_key after running this migration)
INSERT INTO campaign_scheduler_config (supabase_url, service_role_key)
VALUES (
  'https://iwoagrmcszakilvqdydq.supabase.co',
  'REPLACE_WITH_YOUR_SERVICE_ROLE_KEY'
)
ON CONFLICT (id) DO NOTHING;

-- ─── Function: process_scheduled_campaigns ────────────────
CREATE OR REPLACE FUNCTION process_scheduled_campaigns()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  campaign_row RECORD;
  config_row   RECORD;
BEGIN
  -- Read config
  SELECT * INTO config_row FROM campaign_scheduler_config LIMIT 1;

  IF config_row IS NULL OR config_row.service_role_key = 'REPLACE_WITH_YOUR_SERVICE_ROLE_KEY' THEN
    RAISE WARNING 'process_scheduled_campaigns: service_role_key not configured in campaign_scheduler_config';
    RETURN;
  END IF;

  -- Find all campaigns that are due
  FOR campaign_row IN
    SELECT id
    FROM email_campaigns
    WHERE status = 'scheduled'
      AND scheduled_at IS NOT NULL
      AND scheduled_at <= NOW()
  LOOP
    -- Mark as 'sending' immediately to prevent double-sends
    UPDATE email_campaigns
    SET status = 'sending', updated_at = NOW()
    WHERE id = campaign_row.id
      AND status = 'scheduled';  -- double-check to avoid races

    -- Only fire if the update actually changed a row
    IF FOUND THEN
      -- Call the send-email Edge Function via pg_net
      PERFORM extensions.http_post(
        url     := config_row.supabase_url || '/functions/v1/send-email',
        body    := jsonb_build_object(
          'action', 'send_campaign',
          'campaignId', campaign_row.id
        ),
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || config_row.service_role_key
        )
      );

      RAISE LOG 'process_scheduled_campaigns: triggered campaign %', campaign_row.id;
    END IF;
  END LOOP;
END;
$$;

-- ─── Cron Job: run every minute ──────────────────────────
SELECT cron.schedule(
  'process-scheduled-campaigns',
  '* * * * *',
  'SELECT process_scheduled_campaigns()'
);

