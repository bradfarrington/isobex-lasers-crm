-- =============================================
-- Migration: Change folder column to TEXT[] for multi-folder support
-- Run this in the Supabase SQL Editor
-- IMPORTANT: Run AFTER supabase-document-folders.sql
-- =============================================

-- 1. Drop the existing default (can't auto-cast TEXT default to TEXT[])
ALTER TABLE contact_documents ALTER COLUMN folder DROP DEFAULT;

-- 2. Convert column from TEXT to TEXT[]
ALTER TABLE contact_documents
  ALTER COLUMN folder TYPE TEXT[] USING ARRAY[folder];

-- 3. Set new array default
ALTER TABLE contact_documents ALTER COLUMN folder SET DEFAULT '{General}';

-- 4. Rename column for clarity
ALTER TABLE contact_documents RENAME COLUMN folder TO folders;
