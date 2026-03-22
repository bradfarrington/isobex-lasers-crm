-- =============================================
-- Migration: Document Hub (categories + files)
-- Run this in the Supabase SQL Editor
-- Also create a "crm-documents" storage bucket (public: ON)
-- =============================================

-- 1. Document categories
CREATE TABLE IF NOT EXISTS document_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE document_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access" ON document_categories FOR ALL USING (true) WITH CHECK (true);

-- 2. CRM documents (file metadata)
CREATE TABLE IF NOT EXISTS crm_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES document_categories(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER crm_documents_updated_at
  BEFORE UPDATE ON crm_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE crm_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access" ON crm_documents FOR ALL USING (true) WITH CHECK (true);

-- 3. Storage bucket policies for "crm-documents"
-- (Create the bucket manually in Supabase Dashboard → Storage → New bucket → Name: crm-documents, Public: ON)

CREATE POLICY "Allow uploads to crm-documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'crm-documents');

CREATE POLICY "Allow reads from crm-documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'crm-documents');

CREATE POLICY "Allow updates to crm-documents"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'crm-documents');

CREATE POLICY "Allow deletes from crm-documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'crm-documents');
