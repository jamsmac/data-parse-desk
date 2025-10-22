-- =====================================================================
-- Migration: Smart Matching Templates System
-- Description: Store and reuse matching configurations
-- =====================================================================

-- Create matching_templates table
CREATE TABLE IF NOT EXISTS public.matching_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  weights JSONB NOT NULL DEFAULT '{
    "exact": 0.4,
    "fuzzy": 0.3,
    "soundex": 0.15,
    "time": 0.1,
    "pattern": 0.05
  }'::jsonb,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_public BOOLEAN NOT NULL DEFAULT false,
  usage_count INTEGER NOT NULL DEFAULT 0
);

-- Add indexes
CREATE INDEX idx_matching_templates_created_by ON public.matching_templates(created_by);
CREATE INDEX idx_matching_templates_is_public ON public.matching_templates(is_public);
CREATE INDEX idx_matching_templates_created_at ON public.matching_templates(created_at DESC);

-- Enable RLS
ALTER TABLE public.matching_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own templates or public templates
CREATE POLICY "Users can view own and public templates"
  ON public.matching_templates
  FOR SELECT
  USING (
    auth.uid() = created_by OR is_public = true
  );

-- Users can insert their own templates
CREATE POLICY "Users can insert own templates"
  ON public.matching_templates
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Users can update their own templates
CREATE POLICY "Users can update own templates"
  ON public.matching_templates
  FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Users can delete their own templates
CREATE POLICY "Users can delete own templates"
  ON public.matching_templates
  FOR DELETE
  USING (auth.uid() = created_by);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_matching_template_timestamp()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger to update timestamp
CREATE TRIGGER update_matching_template_timestamp_trigger
  BEFORE UPDATE ON public.matching_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_matching_template_timestamp();

-- Function to increment usage count
CREATE OR REPLACE FUNCTION public.increment_template_usage(template_id UUID)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.matching_templates
  SET usage_count = usage_count + 1
  WHERE id = template_id;
END;
$$;

-- Add comments
COMMENT ON TABLE public.matching_templates IS
  'Stores reusable Smart Matching configurations with rules and weights';

COMMENT ON COLUMN public.matching_templates.rules IS
  'Array of matching rules with source/target columns and strategies';

COMMENT ON COLUMN public.matching_templates.weights IS
  'Weights for different matching strategies (exact, fuzzy, soundex, time, pattern)';

COMMENT ON COLUMN public.matching_templates.usage_count IS
  'Tracks how many times this template has been used';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.matching_templates TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_template_usage(UUID) TO authenticated;

-- Verify table created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'matching_templates'
  ) THEN
    RAISE NOTICE '✓ matching_templates table created successfully';
  ELSE
    RAISE WARNING '✗ matching_templates table creation failed';
  END IF;
END $$;
