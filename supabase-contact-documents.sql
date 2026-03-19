-- =============================================
-- Migration: Contact Documents metadata table
-- Run this in the Supabase SQL Editor
-- Also create a "contact-documents" storage bucket (public: ON)
-- =============================================

-- 1. Documents metadata table
CREATE TABLE IF NOT EXISTS contact_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  folder TEXT DEFAULT 'General',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Auto-update updated_at
CREATE TRIGGER contact_documents_updated_at
  BEFORE UPDATE ON contact_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 3. RLS (same open policy as rest of the CRM)
ALTER TABLE contact_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access" ON contact_documents FOR ALL USING (true) WITH CHECK (true);
