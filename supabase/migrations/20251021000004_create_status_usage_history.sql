-- Migration: Create status usage history table
-- Description: Track status usage for autocomplete suggestions
-- Date: 2025-10-21

-- Create status_usage_history table
CREATE TABLE IF NOT EXISTS status_usage_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  column_id UUID NOT NULL,
  status_value TEXT NOT NULL,
  used_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_status_usage_user_column
  ON status_usage_history(user_id, column_id, used_at DESC);

-- Create index for status value lookups
CREATE INDEX IF NOT EXISTS idx_status_usage_value
  ON status_usage_history(user_id, column_id, status_value);

-- Auto-cleanup function (keep last 100 per user per column)
CREATE OR REPLACE FUNCTION cleanup_status_history()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM status_usage_history
  WHERE id IN (
    SELECT id FROM status_usage_history
    WHERE user_id = NEW.user_id
      AND column_id = NEW.column_id
    ORDER BY used_at DESC
    OFFSET 100
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-cleanup
DROP TRIGGER IF EXISTS cleanup_status_history_trigger ON status_usage_history;
CREATE TRIGGER cleanup_status_history_trigger
  AFTER INSERT ON status_usage_history
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_status_history();

-- Enable RLS
ALTER TABLE status_usage_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own status history"
  ON status_usage_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own status history"
  ON status_usage_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own status history"
  ON status_usage_history FOR DELETE
  USING (auth.uid() = user_id);

-- Function to get recent statuses with usage count
CREATE OR REPLACE FUNCTION get_recent_statuses(
  p_user_id UUID,
  p_column_id UUID,
  p_days INTEGER DEFAULT 7,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  status_value TEXT,
  usage_count BIGINT,
  last_used TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    suh.status_value,
    COUNT(*)::BIGINT as usage_count,
    MAX(suh.used_at) as last_used
  FROM status_usage_history suh
  WHERE suh.user_id = p_user_id
    AND suh.column_id = p_column_id
    AND suh.used_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY suh.status_value
  ORDER BY usage_count DESC, last_used DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_recent_statuses(UUID, UUID, INTEGER, INTEGER) TO authenticated;

-- Comment
COMMENT ON TABLE status_usage_history IS 'Tracks status usage for autocomplete suggestions and analytics';
COMMENT ON FUNCTION get_recent_statuses IS 'Returns most frequently used statuses for a user and column';
