-- Fix: "25-3-26 resend Opened" opened count should be 19, not 49
UPDATE email_campaigns
SET stats = jsonb_set(stats, '{opened}', '19'::jsonb)
WHERE name = '25-3-26 resend Opened'
  AND template_id IS NULL
  AND status = 'sent';
