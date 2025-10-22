-- =====================================================
-- FILTER PRESETS TABLE
-- Stores saved filter configurations for quick access
-- Migration: 20251022000005
-- =====================================================

CREATE TABLE IF NOT EXISTS public.filter_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Context
  database_id UUID NOT NULL REFERENCES public.databases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Preset details
  name TEXT NOT NULL,
  description TEXT,

  -- Filter configuration
  filters JSONB NOT NULL, -- Array of FilterGroup objects

  -- Metadata
  is_public BOOLEAN DEFAULT FALSE, -- Share with other users
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_filter_presets_database_id ON public.filter_presets(database_id);
CREATE INDEX idx_filter_presets_user_id ON public.filter_presets(user_id);
CREATE INDEX idx_filter_presets_is_public ON public.filter_presets(is_public);

-- Auto-update timestamp
CREATE TRIGGER update_filter_presets_updated_at
  BEFORE UPDATE ON public.filter_presets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE public.filter_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own presets"
  ON public.filter_presets FOR SELECT
  USING (user_id = auth.uid() OR is_public = TRUE);

CREATE POLICY "Users can create their own presets"
  ON public.filter_presets FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own presets"
  ON public.filter_presets FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own presets"
  ON public.filter_presets FOR DELETE
  USING (user_id = auth.uid());

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.filter_presets TO authenticated;

-- Comments
COMMENT ON TABLE public.filter_presets IS 'Saved filter configurations for quick access';
COMMENT ON COLUMN public.filter_presets.filters IS 'JSONB array of FilterGroup objects with logic and conditions';
COMMENT ON COLUMN public.filter_presets.is_public IS 'Allow other users to view and use this preset';
