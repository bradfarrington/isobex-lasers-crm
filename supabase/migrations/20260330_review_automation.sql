-- ═══════════════════════════════════════════════════════════════════
-- Review Automation Settings (singleton)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS review_automation_settings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled       boolean NOT NULL DEFAULT false,
  initial_delay_days     int NOT NULL DEFAULT 7,
  follow_up_interval_days int NOT NULL DEFAULT 3,
  max_follow_ups         int NOT NULL DEFAULT 3,
  stop_on_click          boolean NOT NULL DEFAULT true,
  template_id   uuid REFERENCES email_templates(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Seed a single row so fetches always work
INSERT INTO review_automation_settings (enabled)
VALUES (false)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════
-- Extend review_requests for automation tracking
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE review_requests
  ADD COLUMN IF NOT EXISTS order_id            uuid REFERENCES orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source              text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS send_count          int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS next_send_at        timestamptz,
  ADD COLUMN IF NOT EXISTS sequence_completed  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_sent_at        timestamptz;

-- Index for the queue processor: find pending follow-ups quickly
CREATE INDEX IF NOT EXISTS idx_review_requests_queue
  ON review_requests (next_send_at)
  WHERE sequence_completed = false;

-- Index for deduplication: one automated request per order
CREATE UNIQUE INDEX IF NOT EXISTS idx_review_requests_order_automated
  ON review_requests (order_id)
  WHERE source = 'automated' AND order_id IS NOT NULL;
