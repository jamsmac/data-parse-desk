-- Storage Bucket for Item Attachments
-- Migration: 20251021000007_item_attachments_storage.sql
-- Purpose: Configure Supabase Storage bucket for file attachments

-- Create storage bucket (if not exists)
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES (
--   'item-attachments',
--   'item-attachments',
--   false, -- Private bucket
--   10485760, -- 10MB in bytes
--   ARRAY[
--     'image/jpeg',
--     'image/png',
--     'image/gif',
--     'image/webp',
--     'application/pdf',
--     'application/msword',
--     'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
--     'application/vnd.ms-excel',
--     'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
--     'text/plain',
--     'text/csv'
--   ]
-- )
-- ON CONFLICT (id) DO NOTHING;

-- Storage Policies for item-attachments bucket

-- Users can view their own attachments
CREATE POLICY "Users can view their own attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'item-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can upload their own attachments
CREATE POLICY "Users can upload their own attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'item-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own attachments
CREATE POLICY "Users can delete their own attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'item-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Comments
-- COMMENT ON TABLE storage.buckets IS 'Storage buckets configuration';
