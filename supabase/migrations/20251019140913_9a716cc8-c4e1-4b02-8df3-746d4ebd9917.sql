-- Создаём таблицу composite_views
CREATE TABLE IF NOT EXISTS composite_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  sql_query TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_composite_views_project ON composite_views(project_id);
CREATE INDEX idx_composite_views_created_by ON composite_views(created_by);

-- Enable RLS
ALTER TABLE composite_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies для composite_views
CREATE POLICY "Users can view composite views in their projects"
ON composite_views FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = composite_views.project_id
    AND (
      p.user_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM project_members pm
        WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can create composite views in their projects"
ON composite_views FOR INSERT
WITH CHECK (
  created_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = composite_views.project_id
    AND (
      p.user_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM project_members pm
        WHERE pm.project_id = p.id 
        AND pm.user_id = auth.uid()
        AND pm.role IN ('owner', 'editor')
      )
    )
  )
);

CREATE POLICY "Users can update their composite views"
ON composite_views FOR UPDATE
USING (created_by = auth.uid());

CREATE POLICY "Users can delete their composite views"
ON composite_views FOR DELETE
USING (created_by = auth.uid());

-- Trigger для updated_at
CREATE TRIGGER update_composite_views_updated_at
BEFORE UPDATE ON composite_views
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Создаём таблицу composite_view_custom_data
CREATE TABLE IF NOT EXISTS composite_view_custom_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  composite_view_id UUID NOT NULL REFERENCES composite_views(id) ON DELETE CASCADE,
  row_identifier TEXT NOT NULL,
  column_name TEXT NOT NULL,
  column_type TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(composite_view_id, row_identifier, column_name)
);

CREATE INDEX idx_composite_custom_data_view ON composite_view_custom_data(composite_view_id);
CREATE INDEX idx_composite_custom_data_row ON composite_view_custom_data(composite_view_id, row_identifier);

-- Enable RLS
ALTER TABLE composite_view_custom_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies для custom data
CREATE POLICY "Users can view custom data in their composite views"
ON composite_view_custom_data FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM composite_views cv
    JOIN projects p ON p.id = cv.project_id
    WHERE cv.id = composite_view_custom_data.composite_view_id
    AND (
      p.user_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM project_members pm
        WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can edit custom data in their composite views"
ON composite_view_custom_data FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM composite_views cv
    JOIN projects p ON p.id = cv.project_id
    WHERE cv.id = composite_view_custom_data.composite_view_id
    AND (
      p.user_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM project_members pm
        WHERE pm.project_id = p.id 
        AND pm.user_id = auth.uid()
        AND pm.role IN ('owner', 'editor')
      )
    )
  )
);

-- Trigger для updated_at
CREATE TRIGGER update_composite_custom_data_updated_at
BEFORE UPDATE ON composite_view_custom_data
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Enable real-time
ALTER PUBLICATION supabase_realtime ADD TABLE composite_view_custom_data;

-- Create schema_analyses table
CREATE TABLE IF NOT EXISTS schema_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  input_type TEXT NOT NULL,
  schema JSONB NOT NULL,
  ai_model TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_schema_analyses_project ON schema_analyses(project_id);
CREATE INDEX idx_schema_analyses_user ON schema_analyses(user_id);

ALTER TABLE schema_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own schema analyses"
ON schema_analyses FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create schema analyses"
ON schema_analyses FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own analyses"
ON schema_analyses FOR DELETE
USING (user_id = auth.uid());