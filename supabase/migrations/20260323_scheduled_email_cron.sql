-- ============================================================
-- pg_cron job: send scheduled email campaigns at their due time
-- Runs every minute, finds campaigns with status='scheduled'
-- and scheduled_at <= now(), then calls the send-email edge fn.
-- ============================================================

-- 1. Enable extensions (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Function that dispatches due campaigns
CREATE OR REPLACE FUNCTION public.dispatch_scheduled_campaigns()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  campaign_row RECORD;
  edge_url    TEXT;
  service_key TEXT;
BEGIN
  -- Build the edge function URL from the project ref
  edge_url := 'https://iwoagrmcszakilvqdydq.supabase.co/functions/v1/send-email';

  -- The service role key is stored in vault or we read it from a config.
  -- Supabase exposes it automatically inside edge functions, but for pg_net
  -- we need to pass it. We'll read it from supabase_functions.hooks config
  -- or we hard-code the anon key (edge functions accept anon key for auth gate,
  -- and the function itself creates a service-role client internally).
  service_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3b2Fncm1jc3pha2lsdnFkeWRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MjQ3MzMsImV4cCI6MjA4OTUwMDczM30.nxldRwdzHvFEIViNnNDeYjlCbl6x5oAl1UWCFHkjekY';

  -- Find all due campaigns
  FOR campaign_row IN
    SELECT id
    FROM public.email_campaigns
    WHERE status = 'scheduled'
      AND scheduled_at IS NOT NULL
      AND scheduled_at <= now()
  LOOP
    -- Mark as 'sending' immediately to prevent duplicate dispatch
    UPDATE public.email_campaigns
    SET status = 'sending', updated_at = now()
    WHERE id = campaign_row.id
      AND status = 'scheduled';  -- optimistic lock

    -- Fire the edge function via pg_net
    PERFORM net.http_post(
      url     := edge_url,
      body    := jsonb_build_object('action', 'send_campaign', 'campaignId', campaign_row.id),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_key
      )
    );

    RAISE LOG 'Dispatched scheduled campaign %', campaign_row.id;
  END LOOP;
END;
$$;

-- 3. Schedule the cron job: every minute
SELECT cron.schedule(
  'dispatch-scheduled-campaigns',  -- job name
  '* * * * *',                      -- every minute
  $$SELECT public.dispatch_scheduled_campaigns()$$
);
