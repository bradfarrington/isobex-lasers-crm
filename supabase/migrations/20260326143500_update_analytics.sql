-- Add browser and country dimensions
ALTER TABLE page_views
ADD COLUMN browser text,
ADD COLUMN country text;
