-- Create table for view preferences
CREATE TABLE IF NOT EXISTS public.view_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id UUID NOT NULL REFERENCES public.databases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  view_type TEXT NOT NULL DEFAULT 'table',
  filters JSONB DEFAULT '[]'::jsonb,
  sort JSONB DEFAULT '{}'::jsonb,
  visible_columns JSONB DEFAULT '[]'::jsonb,
  page_size INTEGER DEFAULT 50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(database_id, user_id, view_type)
);

-- Enable RLS
ALTER TABLE public.view_preferences ENABLE ROW LEVEL SECURITY;

-- Users can manage their own view preferences
CREATE POLICY "Users can manage own view preferences"
ON public.view_preferences
FOR ALL
USING (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE TRIGGER update_view_preferences_updated_at
BEFORE UPDATE ON public.view_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();