-- =============================================
-- SMTP EMAIL SETTINGS
-- Isobex Lasers CRM — March 2026
-- =============================================

-- 1. SMTP configuration table (singleton)
CREATE TABLE IF NOT EXISTS smtp_settings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    smtp_host       TEXT DEFAULT '',
    smtp_port       INT  DEFAULT 587,
    smtp_user       TEXT DEFAULT '',
    smtp_pass       TEXT DEFAULT '',
    smtp_from_name  TEXT DEFAULT '',
    smtp_reply_to   TEXT DEFAULT '',
    smtp_secure     BOOLEAN DEFAULT TRUE,
    smtp_configured BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE smtp_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can manage SMTP settings" ON smtp_settings;
DROP POLICY IF EXISTS "Allow all on smtp_settings" ON smtp_settings;

CREATE POLICY "Allow all on smtp_settings"
    ON smtp_settings FOR ALL
    USING (true)
    WITH CHECK (true);

-- Auto-update updated_at
CREATE TRIGGER set_smtp_settings_updated_at
    BEFORE UPDATE ON smtp_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Seed a single empty row so the UI always has one to read/update
INSERT INTO smtp_settings (smtp_host) VALUES ('');
