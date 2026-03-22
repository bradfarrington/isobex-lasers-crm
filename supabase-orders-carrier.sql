-- Add shipping_carrier column to orders table
alter table orders add column if not exists shipping_carrier text;
