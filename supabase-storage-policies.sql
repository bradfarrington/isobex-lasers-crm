-- =============================================
-- Fix: Allow all access to the contact-documents storage bucket
-- Run this in the Supabase SQL Editor
-- =============================================

-- Allow anyone to upload files
CREATE POLICY "Allow uploads to contact-documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'contact-documents');

-- Allow anyone to read files
CREATE POLICY "Allow reads from contact-documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'contact-documents');

-- Allow anyone to update files (for upsert)
CREATE POLICY "Allow updates to contact-documents"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'contact-documents');

-- Allow anyone to delete files
CREATE POLICY "Allow deletes from contact-documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'contact-documents');
