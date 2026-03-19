-- =============================================
-- Migration: Document Folders table (global)
-- Run this in the Supabase SQL Editor
-- Folders are shared across ALL contacts/leads
-- =============================================

CREATE TABLE IF NOT EXISTS document_folders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  folder_name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS (same open policy as the rest of the CRM)
ALTER TABLE document_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access" ON document_folders FOR ALL USING (true) WITH CHECK (true);
