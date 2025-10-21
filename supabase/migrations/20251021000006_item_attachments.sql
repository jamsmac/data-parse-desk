-- File Attachments for Checklist Items
-- Migration: 20251021000006_item_attachments.sql
-- Purpose: Enable file uploads to checklist items with storage integration

-- Create item_attachments table
CREATE TABLE IF NOT EXISTS item_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Связь с composite view и item
  composite_view_id UUID NOT NULL REFERENCES composite_views(id) ON DELETE CASCADE,
  row_identifier TEXT NOT NULL,
  column_name TEXT NOT NULL,
  item_index INTEGER NOT NULL,

  -- Информация о файле
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL, -- bytes
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL, -- путь в Supabase Storage

  -- Metadata
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Optional: thumbnail для images (future enhancement)
  thumbnail_path TEXT,

  -- Composite constraint для уникальности
  CONSTRAINT unique_attachment UNIQUE(composite_view_id, row_identifier, column_name, item_index, file_name)
);

-- Indexes для быстрого поиска
CREATE INDEX idx_item_attachments_view
  ON item_attachments(composite_view_id, row_identifier, column_name);

CREATE INDEX idx_item_attachments_item
  ON item_attachments(composite_view_id, row_identifier, column_name, item_index);

CREATE INDEX idx_item_attachments_user
  ON item_attachments(uploaded_by);

CREATE INDEX idx_item_attachments_date
  ON item_attachments(uploaded_at DESC);

-- Enable RLS
ALTER TABLE item_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view attachments in their composite views
CREATE POLICY "Users can view attachments in their views"
  ON item_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM composite_views cv
      WHERE cv.id = item_attachments.composite_view_id
      AND cv.user_id = auth.uid()
    )
  );

-- Users can insert attachments to their views
CREATE POLICY "Users can upload attachments to their views"
  ON item_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM composite_views cv
      WHERE cv.id = item_attachments.composite_view_id
      AND cv.user_id = auth.uid()
    )
  );

-- Users can delete attachments from their views
CREATE POLICY "Users can delete attachments from their views"
  ON item_attachments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM composite_views cv
      WHERE cv.id = item_attachments.composite_view_id
      AND cv.user_id = auth.uid()
    )
  );

-- Function: Get attachments for specific checklist item
CREATE OR REPLACE FUNCTION get_item_attachments(
  p_composite_view_id UUID,
  p_row_identifier TEXT,
  p_column_name TEXT,
  p_item_index INTEGER
)
RETURNS TABLE (
  id UUID,
  file_name TEXT,
  file_size BIGINT,
  mime_type TEXT,
  storage_path TEXT,
  thumbnail_path TEXT,
  uploaded_by UUID,
  uploaded_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Verify user has access to this composite view
  IF NOT EXISTS (
    SELECT 1 FROM composite_views cv
    WHERE cv.id = p_composite_view_id
    AND cv.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    ia.id,
    ia.file_name,
    ia.file_size,
    ia.mime_type,
    ia.storage_path,
    ia.thumbnail_path,
    ia.uploaded_by,
    ia.uploaded_at
  FROM item_attachments ia
  WHERE ia.composite_view_id = p_composite_view_id
    AND ia.row_identifier = p_row_identifier
    AND ia.column_name = p_column_name
    AND ia.item_index = p_item_index
  ORDER BY ia.uploaded_at DESC;
END;
$$;

-- Function: Get attachment count for item
CREATE OR REPLACE FUNCTION get_item_attachment_count(
  p_composite_view_id UUID,
  p_row_identifier TEXT,
  p_column_name TEXT,
  p_item_index INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER
  INTO v_count
  FROM item_attachments ia
  WHERE ia.composite_view_id = p_composite_view_id
    AND ia.row_identifier = p_row_identifier
    AND ia.column_name = p_column_name
    AND ia.item_index = p_item_index;

  RETURN v_count;
END;
$$;

-- Function: Delete attachment (DB record only, storage cleanup handled by Edge Function)
CREATE OR REPLACE FUNCTION delete_item_attachment(
  p_attachment_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_storage_path TEXT;
  v_thumbnail_path TEXT;
  v_deleted BOOLEAN := FALSE;
BEGIN
  -- Get storage paths and verify access
  SELECT storage_path, thumbnail_path
  INTO v_storage_path, v_thumbnail_path
  FROM item_attachments ia
  WHERE ia.id = p_attachment_id
    AND EXISTS (
      SELECT 1 FROM composite_views cv
      WHERE cv.id = ia.composite_view_id
      AND cv.user_id = auth.uid()
    );

  IF v_storage_path IS NULL THEN
    RAISE EXCEPTION 'Attachment not found or access denied';
  END IF;

  -- Delete from DB
  DELETE FROM item_attachments WHERE id = p_attachment_id;
  v_deleted := TRUE;

  -- Return paths for storage cleanup
  RETURN jsonb_build_object(
    'success', v_deleted,
    'storage_path', v_storage_path,
    'thumbnail_path', v_thumbnail_path
  );
END;
$$;

-- Trigger: Auto-cleanup orphaned attachments (optional future enhancement)
-- This would require a scheduled job to scan for attachments
-- where composite_view or row no longer exists

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_item_attachments TO authenticated;
GRANT EXECUTE ON FUNCTION get_item_attachment_count TO authenticated;
GRANT EXECUTE ON FUNCTION delete_item_attachment TO authenticated;

-- Comments
COMMENT ON TABLE item_attachments IS 'Stores metadata for files attached to checklist items';
COMMENT ON FUNCTION get_item_attachments IS 'Retrieves all attachments for a specific checklist item';
COMMENT ON FUNCTION get_item_attachment_count IS 'Returns count of attachments for a specific item';
COMMENT ON FUNCTION delete_item_attachment IS 'Deletes attachment record and returns storage paths for cleanup';
