-- ═══════════════════════════════════════════════════════════
-- Import historical HighLevel email campaigns
-- These campaigns were sent via HighLevel before the CRM was built.
-- Stats are stored in the stats JSONB column since we don't have
-- individual recipient records for these.
-- ═══════════════════════════════════════════════════════════

INSERT INTO email_campaigns (id, name, subject, template_id, blocks, settings, html_content, status, send_mode, scheduled_at, sent_at, total_recipients, batch_size, batch_interval, stats, created_at, updated_at)
VALUES
  -- Mar 25, 2026
  (gen_random_uuid(), '25-3-26 resend Opened', '25-3-26 resend Opened', NULL, '[]'::jsonb, '{}'::jsonb, '', 'sent', NULL, NULL, '2026-03-25 16:45:00+00', 86, NULL, NULL, '{"delivered": 86, "opened": 49, "clicked": 0, "bounced": 0, "failed": 0, "revenue": 0}'::jsonb, '2026-03-25 16:45:00+00', NOW()),

  -- Mar 23, 2026
  (gen_random_uuid(), '23-3-26 new unopened', '23-3-26 new unopened', NULL, '[]'::jsonb, '{}'::jsonb, '', 'sent', NULL, NULL, '2026-03-23 16:45:00+00', 69, NULL, NULL, '{"delivered": 69, "opened": 19, "clicked": 0, "bounced": 0, "failed": 0, "revenue": 0}'::jsonb, '2026-03-23 16:45:00+00', NOW()),
  (gen_random_uuid(), '23-3-26 resend delivered', '23-3-26 resend delivered', NULL, '[]'::jsonb, '{}'::jsonb, '', 'sent', NULL, NULL, '2026-03-23 16:45:00+00', 167, NULL, NULL, '{"delivered": 167, "opened": 22, "clicked": 5, "bounced": 0, "failed": 0, "revenue": 0}'::jsonb, '2026-03-23 16:45:00+00', NOW()),

  -- Mar 17, 2026
  (gen_random_uuid(), '17-3-26 resend delivered', '17-3-26 resend delivered', NULL, '[]'::jsonb, '{}'::jsonb, '', 'sent', NULL, NULL, '2026-03-17 16:56:00+00', 185, NULL, NULL, '{"delivered": 185, "opened": 22, "clicked": 2, "bounced": 0, "failed": 0, "revenue": 0}'::jsonb, '2026-03-17 16:56:00+00', NOW()),
  (gen_random_uuid(), '17-3-26 resend delivered (AM)', '17-3-26 resend delivered', NULL, '[]'::jsonb, '{}'::jsonb, '', 'sent', NULL, NULL, '2026-03-17 10:01:00+00', 185, NULL, NULL, '{"delivered": 185, "opened": 14, "clicked": 1, "bounced": 0, "failed": 0, "revenue": 0}'::jsonb, '2026-03-17 10:01:00+00', NOW()),

  -- Mar 16, 2026
  (gen_random_uuid(), '15-03-26 cold new', '15-03-26 cold new', NULL, '[]'::jsonb, '{}'::jsonb, '', 'sent', NULL, NULL, '2026-03-16 10:30:00+00', 56, NULL, NULL, '{"delivered": 56, "opened": 17, "clicked": 6, "bounced": 0, "failed": 0, "revenue": 0}'::jsonb, '2026-03-16 10:30:00+00', NOW()),

  -- Mar 10, 2026
  (gen_random_uuid(), 'Delivered resend 10-3-26', 'Delivered resend 10-3-26', NULL, '[]'::jsonb, '{}'::jsonb, '', 'sent', NULL, NULL, '2026-03-10 10:30:00+00', 208, NULL, NULL, '{"delivered": 208, "opened": 22, "clicked": 5, "bounced": 0, "failed": 0, "revenue": 0}'::jsonb, '2026-03-10 10:30:00+00', NOW()),

  -- Mar 09, 2026
  (gen_random_uuid(), 'opened resend 9-3-26', 'opened resend 9-3-26', NULL, '[]'::jsonb, '{}'::jsonb, '', 'sent', NULL, NULL, '2026-03-09 15:30:00+00', 59, NULL, NULL, '{"delivered": 59, "opened": 50, "clicked": 4, "bounced": 0, "failed": 0, "revenue": 0}'::jsonb, '2026-03-09 15:30:00+00', NOW()),
  (gen_random_uuid(), 'Clicked resend 9-3-26', 'Clicked resend 9-3-26', NULL, '[]'::jsonb, '{}'::jsonb, '', 'sent', NULL, NULL, '2026-03-09 13:30:00+00', 39, NULL, NULL, '{"delivered": 39, "opened": 36, "clicked": 28, "bounced": 0, "failed": 0, "revenue": 0}'::jsonb, '2026-03-09 13:30:00+00', NOW()),
  (gen_random_uuid(), 'Campaign 6 cold 9-3-26', 'Campaign 6 cold 9-3-26', NULL, '[]'::jsonb, '{}'::jsonb, '', 'sent', NULL, NULL, '2026-03-09 10:00:00+00', 48, NULL, NULL, '{"delivered": 48, "opened": 18, "clicked": 7, "bounced": 0, "failed": 0, "revenue": 0}'::jsonb, '2026-03-09 10:00:00+00', NOW()),

  -- Mar 02, 2026
  (gen_random_uuid(), 'Campaign 5 cold 02-03-26', 'Campaign 5 cold 02-03-26', NULL, '[]'::jsonb, '{}'::jsonb, '', 'sent', NULL, NULL, '2026-03-02 10:01:00+00', 36, NULL, NULL, '{"delivered": 36, "opened": 10, "clicked": 5, "bounced": 0, "failed": 0, "revenue": 0}'::jsonb, '2026-03-02 10:01:00+00', NOW()),

  -- Feb 23, 2026
  (gen_random_uuid(), 'Campaign 5 cold 23-02', 'Campaign 5 cold 23-02', NULL, '[]'::jsonb, '{}'::jsonb, '', 'sent', NULL, NULL, '2026-02-23 10:30:00+00', 133, NULL, NULL, '{"delivered": 133, "opened": 53, "clicked": 24, "bounced": 0, "failed": 0, "revenue": 0}'::jsonb, '2026-02-23 10:30:00+00', NOW()),
  (gen_random_uuid(), 'Campaign 4 cold 23-02-26', 'Campaign 4 cold 23-02-26', NULL, '[]'::jsonb, '{}'::jsonb, '', 'sent', NULL, NULL, '2026-02-23 10:30:00+00', 1, NULL, NULL, '{"delivered": 1, "opened": 1, "clicked": 1, "bounced": 0, "failed": 0, "revenue": 0}'::jsonb, '2026-02-23 10:30:00+00', NOW()),

  -- Feb 20, 2026
  (gen_random_uuid(), 'Warm Clicked Resend 20-02-26', 'Warm Clicked Resend 20-02-26', NULL, '[]'::jsonb, '{}'::jsonb, '', 'sent', NULL, NULL, '2026-02-20 10:45:00+00', 17, NULL, NULL, '{"delivered": 17, "opened": 14, "clicked": 10, "bounced": 0, "failed": 0, "revenue": 0}'::jsonb, '2026-02-20 10:45:00+00', NOW()),
  (gen_random_uuid(), 'Warm Unopened Resend 20-02-26', 'Warm Unopened Resend 20-02-26', NULL, '[]'::jsonb, '{}'::jsonb, '', 'sent', NULL, NULL, '2026-02-20 10:45:00+00', 41, NULL, NULL, '{"delivered": 41, "opened": 14, "clicked": 0, "bounced": 0, "failed": 0, "revenue": 0}'::jsonb, '2026-02-20 10:45:00+00', NOW()),
  (gen_random_uuid(), 'Cold unopened 20-02-06', 'Cold unopened 20-02-06', NULL, '[]'::jsonb, '{}'::jsonb, '', 'sent', NULL, NULL, '2026-02-20 10:45:00+00', 25, NULL, NULL, '{"delivered": 25, "opened": 7, "clicked": 0, "bounced": 0, "failed": 0, "revenue": 0}'::jsonb, '2026-02-20 10:45:00+00', NOW()),
  (gen_random_uuid(), 'Cold Clicked Resend 20-02-26', 'Cold Clicked Resend 20-02-26', NULL, '[]'::jsonb, '{}'::jsonb, '', 'sent', NULL, NULL, '2026-02-20 10:45:00+00', 8, NULL, NULL, '{"delivered": 8, "opened": 5, "clicked": 5, "bounced": 0, "failed": 0, "revenue": 0}'::jsonb, '2026-02-20 10:45:00+00', NOW()),

  -- Feb 17, 2026
  (gen_random_uuid(), 'Campaign 3 cold 17-02-26', 'Campaign 3 cold 17-02-26', NULL, '[]'::jsonb, '{}'::jsonb, '', 'sent', NULL, NULL, '2026-02-17 08:52:00+00', 76, NULL, NULL, '{"delivered": 76, "opened": 27, "clicked": 13, "bounced": 0, "failed": 0, "revenue": 0}'::jsonb, '2026-02-17 08:52:00+00', NOW()),

  -- Feb 16, 2026
  (gen_random_uuid(), 'Warm Campaign 3 16-02-26 (clone)', 'Warm Campaign 3 16-02-26 (clone)', NULL, '[]'::jsonb, '{}'::jsonb, '', 'sent', NULL, NULL, '2026-02-16 10:38:00+00', 3, NULL, NULL, '{"delivered": 3, "opened": 2, "clicked": 1, "bounced": 0, "failed": 0, "revenue": 0}'::jsonb, '2026-02-16 10:38:00+00', NOW()),
  (gen_random_uuid(), 'Campaign 2 13-02-26', 'Campaign 2 13-02-26', NULL, '[]'::jsonb, '{}'::jsonb, '', 'sent', NULL, NULL, '2026-02-16 08:30:00+00', 67, NULL, NULL, '{"delivered": 67, "opened": 35, "clicked": 12, "bounced": 0, "failed": 0, "revenue": 0}'::jsonb, '2026-02-16 08:30:00+00', NOW()),
  (gen_random_uuid(), 'Warm Campaign 3 16-02-26', 'Warm Campaign 3 16-02-26', NULL, '[]'::jsonb, '{}'::jsonb, '', 'sent', NULL, NULL, '2026-02-16 08:30:00+00', 55, NULL, NULL, '{"delivered": 55, "opened": 31, "clicked": 16, "bounced": 0, "failed": 0, "revenue": 0}'::jsonb, '2026-02-16 08:30:00+00', NOW()),

  -- Feb 13, 2026
  (gen_random_uuid(), 'Campaign 1 12 Feb 26', 'Campaign 1 12 Feb 26', NULL, '[]'::jsonb, '{}'::jsonb, '', 'sent', NULL, NULL, '2026-02-13 08:00:00+00', 40, NULL, NULL, '{"delivered": 40, "opened": 17, "clicked": 8, "bounced": 0, "failed": 0, "revenue": 0}'::jsonb, '2026-02-13 08:00:00+00', NOW()),

  -- Feb 04, 2026
  (gen_random_uuid(), 'Phase 2 email resend-unopened', 'Phase 2 email resend-unopened', NULL, '[]'::jsonb, '{}'::jsonb, '', 'sent', NULL, NULL, '2026-02-04 03:34:00+00', 3, NULL, NULL, '{"delivered": 3, "opened": 1, "clicked": 0, "bounced": 0, "failed": 0, "revenue": 23.4}'::jsonb, '2026-02-04 03:34:00+00', NOW()),

  -- Feb 03, 2026
  (gen_random_uuid(), 'Phase 2 email', 'Phase 2 email', NULL, '[]'::jsonb, '{}'::jsonb, '', 'sent', NULL, NULL, '2026-02-03 15:34:00+00', 7, NULL, NULL, '{"delivered": 7, "opened": 4, "clicked": 2, "bounced": 0, "failed": 0, "revenue": 58.19}'::jsonb, '2026-02-03 15:34:00+00', NOW());
