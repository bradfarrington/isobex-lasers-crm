-- Add unsubscribed_at timestamp to contacts for tracking when unsubscribes happen
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMPTZ;

-- Backfill: set unsubscribed_at for contacts already marked as unsubscribed
UPDATE contacts
SET unsubscribed_at = NOW()
WHERE unsubscribed = true AND unsubscribed_at IS NULL;
