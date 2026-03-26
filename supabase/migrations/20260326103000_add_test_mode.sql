-- Add test_mode flag to store_config
ALTER TABLE store_config ADD COLUMN IF NOT EXISTS test_mode boolean NOT NULL DEFAULT false;
