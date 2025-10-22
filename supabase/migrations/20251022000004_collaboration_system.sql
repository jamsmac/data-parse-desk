-- =====================================================
-- COLLABORATION SYSTEM
-- Implements real-time presence, comments, and activity tracking
-- Migration: 20251022000004
-- =====================================================

-- =====================================================
-- 1. USER PRESENCE TABLE
-- Tracks online users and their current context
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  database_id UUID REFERENCES public.databases(id) ON DELETE CASCADE,

  -- User information
  user_name TEXT,
  user_email TEXT,
  user_avatar TEXT,

  -- Current context
  current_view TEXT, -- 'table', 'kanban', 'calendar', 'gallery'
  current_row_id UUID,
  current_cell_column TEXT,

  -- Cursor position (for collaborative editing)
  cursor_x INTEGER,
  cursor_y INTEGER,

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'idle', 'away')),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_presence_user_id ON public.user_presence(user_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_project_id ON public.user_presence(project_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_database_id ON public.user_presence(database_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_last_seen ON public.user_presence(last_seen_at);
CREATE INDEX IF NOT EXISTS idx_user_presence_status ON public.user_presence(status);

-- Auto-update timestamp
DROP TRIGGER IF EXISTS update_user_presence_updated_at ON public.user_presence;
CREATE TRIGGER update_user_presence_updated_at
  BEFORE UPDATE ON public.user_presence
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view presence in their projects"
  ON public.user_presence FOR SELECT
  USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      LEFT JOIN public.project_members pm ON p.id = pm.project_id
      WHERE p.user_id = auth.uid() OR pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own presence"
  ON public.user_presence FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =====================================================
-- 2. COMMENTS TABLE (Enhancement)
-- Cell-level and row-level comments
-- Note: Table already exists, adding new columns
-- =====================================================

-- Add new columns to existing comments table
DO $$
BEGIN
  -- Add column_name if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='comments' AND column_name='column_name') THEN
    ALTER TABLE public.comments ADD COLUMN column_name TEXT;
  END IF;

  -- Add parent_id if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='comments' AND column_name='parent_id') THEN
    ALTER TABLE public.comments ADD COLUMN parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE;
  END IF;

  -- Add thread_id if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='comments' AND column_name='thread_id') THEN
    ALTER TABLE public.comments ADD COLUMN thread_id UUID;
  END IF;

  -- Add project_id if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='comments' AND column_name='project_id') THEN
    ALTER TABLE public.comments ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;
  END IF;

  -- Add user_name if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='comments' AND column_name='user_name') THEN
    ALTER TABLE public.comments ADD COLUMN user_name TEXT;
  END IF;

  -- Add user_avatar if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='comments' AND column_name='user_avatar') THEN
    ALTER TABLE public.comments ADD COLUMN user_avatar TEXT;
  END IF;

  -- Add resolved if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='comments' AND column_name='resolved') THEN
    ALTER TABLE public.comments ADD COLUMN resolved BOOLEAN DEFAULT FALSE;
  END IF;

  -- Add resolved_by if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='comments' AND column_name='resolved_by') THEN
    ALTER TABLE public.comments ADD COLUMN resolved_by UUID REFERENCES auth.users(id);
  END IF;

  -- Add resolved_at if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='comments' AND column_name='resolved_at') THEN
    ALTER TABLE public.comments ADD COLUMN resolved_at TIMESTAMPTZ;
  END IF;

  -- Add reactions if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='comments' AND column_name='reactions') THEN
    ALTER TABLE public.comments ADD COLUMN reactions JSONB DEFAULT '{}'::jsonb;
  END IF;

  -- Add attachments if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='comments' AND column_name='attachments') THEN
    ALTER TABLE public.comments ADD COLUMN attachments JSONB DEFAULT '[]'::jsonb;
  END IF;

  -- Add metadata if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='comments' AND column_name='metadata') THEN
    ALTER TABLE public.comments ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
  END IF;

  -- Add deleted_at if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='comments' AND column_name='deleted_at') THEN
    ALTER TABLE public.comments ADD COLUMN deleted_at TIMESTAMPTZ;
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_comments_database_id ON public.comments(database_id);
CREATE INDEX IF NOT EXISTS idx_comments_row_id ON public.comments(row_id);
CREATE INDEX IF NOT EXISTS idx_comments_column_name ON public.comments(column_name);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON public.comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_thread_id ON public.comments(thread_id);
CREATE INDEX IF NOT EXISTS idx_comments_resolved ON public.comments(resolved);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON public.comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_mentions ON public.comments USING GIN(mentions);

-- Auto-update timestamp
DROP TRIGGER IF EXISTS update_comments_updated_at ON public.comments;
CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments in their databases"
  ON public.comments FOR SELECT
  USING (
    database_id IN (
      SELECT d.id FROM public.databases d
      LEFT JOIN public.projects p ON d.project_id = p.id
      LEFT JOIN public.project_members pm ON p.id = pm.project_id
      WHERE d.created_by = auth.uid()
        OR p.user_id = auth.uid()
        OR pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create comments in their databases"
  ON public.comments FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    database_id IN (
      SELECT d.id FROM public.databases d
      LEFT JOIN public.projects p ON d.project_id = p.id
      LEFT JOIN public.project_members pm ON p.id = pm.project_id
      WHERE d.created_by = auth.uid()
        OR p.user_id = auth.uid()
        OR (pm.user_id = auth.uid() AND pm.role IN ('owner', 'editor'))
    )
  );

CREATE POLICY "Users can update their own comments"
  ON public.comments FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments"
  ON public.comments FOR DELETE
  USING (user_id = auth.uid());

-- =====================================================
-- 3. ACTIVITY LOG TABLE
-- Tracks all user actions for audit and activity feed
-- =====================================================

CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Context
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  database_id UUID REFERENCES public.databases(id) ON DELETE CASCADE,

  -- User
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT,
  user_avatar TEXT,

  -- Activity
  action TEXT NOT NULL, -- 'create', 'update', 'delete', 'comment', 'share', etc.
  entity_type TEXT NOT NULL, -- 'row', 'column', 'database', 'project', 'comment'
  entity_id UUID,

  -- Details
  description TEXT,
  changes JSONB DEFAULT '{}'::jsonb, -- { "before": {...}, "after": {...} }
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_activity_log_project_id ON public.activity_log(project_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_database_id ON public.activity_log(database_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON public.activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON public.activity_log(action);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity_type ON public.activity_log(entity_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON public.activity_log(created_at DESC);

-- Partitioning by month (for performance at scale)
-- CREATE TABLE activity_log_2025_10 PARTITION OF activity_log
--   FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');

-- RLS Policies
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view activity in their projects"
  ON public.activity_log FOR SELECT
  USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      LEFT JOIN public.project_members pm ON p.id = pm.project_id
      WHERE p.user_id = auth.uid() OR pm.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert activity logs"
  ON public.activity_log FOR INSERT
  WITH CHECK (true); -- Activities are created by triggers/functions

-- =====================================================
-- 4. HELPER FUNCTIONS
-- =====================================================

-- Update user presence
CREATE OR REPLACE FUNCTION public.update_presence(
  p_project_id UUID,
  p_database_id UUID,
  p_current_view TEXT DEFAULT NULL,
  p_current_row_id UUID DEFAULT NULL,
  p_current_cell_column TEXT DEFAULT NULL,
  p_cursor_x INTEGER DEFAULT NULL,
  p_cursor_y INTEGER DEFAULT NULL,
  p_status TEXT DEFAULT 'active'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_presence_id UUID;
  v_user_name TEXT;
  v_user_email TEXT;
  v_user_avatar TEXT;
BEGIN
  -- Get user info
  SELECT
    raw_user_meta_data->>'full_name',
    email,
    raw_user_meta_data->>'avatar_url'
  INTO v_user_name, v_user_email, v_user_avatar
  FROM auth.users
  WHERE id = auth.uid();

  -- Upsert presence
  INSERT INTO public.user_presence (
    user_id,
    project_id,
    database_id,
    user_name,
    user_email,
    user_avatar,
    current_view,
    current_row_id,
    current_cell_column,
    cursor_x,
    cursor_y,
    status,
    last_seen_at
  ) VALUES (
    auth.uid(),
    p_project_id,
    p_database_id,
    v_user_name,
    v_user_email,
    v_user_avatar,
    p_current_view,
    p_current_row_id,
    p_current_cell_column,
    p_cursor_x,
    p_cursor_y,
    p_status,
    NOW()
  )
  ON CONFLICT (id)
  DO UPDATE SET
    project_id = EXCLUDED.project_id,
    database_id = EXCLUDED.database_id,
    current_view = EXCLUDED.current_view,
    current_row_id = EXCLUDED.current_row_id,
    current_cell_column = EXCLUDED.current_cell_column,
    cursor_x = EXCLUDED.cursor_x,
    cursor_y = EXCLUDED.cursor_y,
    status = EXCLUDED.status,
    last_seen_at = NOW()
  RETURNING id INTO v_presence_id;

  RETURN v_presence_id;
END;
$$;

-- Get active users in a database
CREATE OR REPLACE FUNCTION public.get_active_users(
  p_database_id UUID,
  p_max_idle_minutes INTEGER DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  user_avatar TEXT,
  current_view TEXT,
  current_row_id UUID,
  current_cell_column TEXT,
  cursor_x INTEGER,
  cursor_y INTEGER,
  status TEXT,
  last_seen_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    id,
    user_id,
    user_name,
    user_email,
    user_avatar,
    current_view,
    current_row_id,
    current_cell_column,
    cursor_x,
    cursor_y,
    status,
    last_seen_at
  FROM public.user_presence
  WHERE database_id = p_database_id
    AND last_seen_at > NOW() - INTERVAL '1 minute' * p_max_idle_minutes
    AND user_id != auth.uid() -- Exclude current user
  ORDER BY last_seen_at DESC;
$$;

-- Log activity
CREATE OR REPLACE FUNCTION public.log_activity(
  p_project_id UUID,
  p_database_id UUID,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_description TEXT DEFAULT NULL,
  p_changes JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_activity_id UUID;
  v_user_name TEXT;
  v_user_avatar TEXT;
BEGIN
  -- Get user info
  SELECT
    raw_user_meta_data->>'full_name',
    raw_user_meta_data->>'avatar_url'
  INTO v_user_name, v_user_avatar
  FROM auth.users
  WHERE id = auth.uid();

  -- Insert activity
  INSERT INTO public.activity_log (
    project_id,
    database_id,
    user_id,
    user_name,
    user_avatar,
    action,
    entity_type,
    entity_id,
    description,
    changes,
    metadata
  ) VALUES (
    p_project_id,
    p_database_id,
    auth.uid(),
    v_user_name,
    v_user_avatar,
    p_action,
    p_entity_type,
    p_entity_id,
    p_description,
    p_changes,
    p_metadata
  )
  RETURNING id INTO v_activity_id;

  RETURN v_activity_id;
END;
$$;

-- Get activity feed
CREATE OR REPLACE FUNCTION public.get_activity_feed(
  p_database_id UUID DEFAULT NULL,
  p_project_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  user_name TEXT,
  user_avatar TEXT,
  action TEXT,
  entity_type TEXT,
  entity_id UUID,
  description TEXT,
  changes JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    id,
    user_id,
    user_name,
    user_avatar,
    action,
    entity_type,
    entity_id,
    description,
    changes,
    metadata,
    created_at
  FROM public.activity_log
  WHERE (p_database_id IS NULL OR database_id = p_database_id)
    AND (p_project_id IS NULL OR project_id = p_project_id)
  ORDER BY created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

-- Clean up old presence records (run periodically)
CREATE OR REPLACE FUNCTION public.cleanup_stale_presence()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM public.user_presence
  WHERE last_seen_at < NOW() - INTERVAL '1 hour';

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;

-- =====================================================
-- 5. REALTIME PUBLICATIONS
-- Enable Supabase Realtime for collaboration tables
-- =====================================================

-- Enable realtime on presence
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;

-- Enable realtime on comments
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;

-- Enable realtime on activity_log
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_log;

-- =====================================================
-- 6. GRANTS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_presence TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT SELECT ON public.activity_log TO authenticated;
GRANT INSERT ON public.activity_log TO service_role;

GRANT EXECUTE ON FUNCTION public.update_presence TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_users TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_activity TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_activity_feed TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_stale_presence TO service_role;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

COMMENT ON TABLE public.user_presence IS 'Tracks online users and their current context for real-time collaboration';
COMMENT ON TABLE public.comments IS 'Cell-level and row-level comments with threading and reactions';
COMMENT ON TABLE public.activity_log IS 'Audit log of all user actions for activity feed';
