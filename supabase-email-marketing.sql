-- ═══════════════════════════════════════
-- EMAIL MARKETING: Templates, Campaigns, Recipients
-- ═══════════════════════════════════════

-- Email Templates (reusable email designs)
CREATE TABLE IF NOT EXISTS email_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL DEFAULT 'Untitled Template',
  subject     TEXT NOT NULL DEFAULT '',
  blocks      JSONB NOT NULL DEFAULT '[]'::jsonb,
  settings    JSONB NOT NULL DEFAULT '{}'::jsonb,
  mjml_source TEXT NOT NULL DEFAULT '',
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Email Campaigns
CREATE TABLE IF NOT EXISTS email_campaigns (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL DEFAULT 'Untitled Campaign',
  subject           TEXT NOT NULL DEFAULT '',
  template_id       UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  blocks            JSONB NOT NULL DEFAULT '[]'::jsonb,
  settings          JSONB NOT NULL DEFAULT '{}'::jsonb,
  html_content      TEXT NOT NULL DEFAULT '',
  status            TEXT NOT NULL DEFAULT 'draft',       -- draft, scheduled, sending, sent, failed
  send_mode         TEXT DEFAULT 'now',                  -- now, scheduled, batch
  scheduled_at      TIMESTAMPTZ,
  sent_at           TIMESTAMPTZ,
  total_recipients  INTEGER NOT NULL DEFAULT 0,
  batch_size        INTEGER,
  batch_interval    INTEGER,                             -- minutes
  stats             JSONB DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Campaign Recipients
CREATE TABLE IF NOT EXISTS campaign_recipients (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id   UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
  contact_id    UUID REFERENCES contacts(id) ON DELETE SET NULL,
  email         TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending',  -- pending, sent, delivered, opened, clicked, bounced, failed
  opened_at     TIMESTAMPTZ,
  clicked_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign ON campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_contact  ON campaign_recipients(contact_id);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_status       ON email_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_email_templates_active       ON email_templates(active);

-- RLS (permissive for now — adjust as needed)
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on email_templates" ON email_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on email_campaigns" ON email_campaigns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on campaign_recipients" ON campaign_recipients FOR ALL USING (true) WITH CHECK (true);
