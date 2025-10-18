-- Create enum for app roles
CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'editor', 'viewer');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, project_id)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _project_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND project_id = _project_id
      AND role = _role
  )
$$;

-- Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID, _project_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
    AND project_id = _project_id
  LIMIT 1
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view roles in their projects"
ON public.user_roles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = user_roles.project_id
    AND (p.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
    ))
  )
);

CREATE POLICY "Project owners can manage roles"
ON public.user_roles
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = user_roles.project_id
    AND p.user_id = auth.uid()
  )
);

-- Create permissions table
CREATE TABLE public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create role_permissions table
CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(role, permission_id, project_id)
);

-- Enable RLS
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for permissions
CREATE POLICY "Everyone can view permissions"
ON public.permissions
FOR SELECT
USING (true);

CREATE POLICY "Users can view role permissions in their projects"
ON public.role_permissions
FOR SELECT
USING (
  project_id IS NULL OR EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = role_permissions.project_id
    AND (p.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
    ))
  )
);

CREATE POLICY "Project owners can manage role permissions"
ON public.role_permissions
FOR ALL
USING (
  project_id IS NULL OR EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = role_permissions.project_id
    AND p.user_id = auth.uid()
  )
);

-- Insert default permissions
INSERT INTO public.permissions (name, description, category) VALUES
  ('view_project', 'View project details', 'project'),
  ('edit_project', 'Edit project settings', 'project'),
  ('delete_project', 'Delete project', 'project'),
  ('manage_members', 'Invite and remove members', 'project'),
  ('view_database', 'View database', 'database'),
  ('create_database', 'Create new database', 'database'),
  ('edit_database', 'Edit database structure', 'database'),
  ('delete_database', 'Delete database', 'database'),
  ('view_data', 'View table data', 'data'),
  ('create_data', 'Create new rows', 'data'),
  ('edit_data', 'Edit existing data', 'data'),
  ('delete_data', 'Delete data', 'data'),
  ('import_data', 'Import data from files', 'data'),
  ('export_data', 'Export data to files', 'data'),
  ('view_reports', 'View reports', 'reports'),
  ('create_reports', 'Create new reports', 'reports'),
  ('manage_integrations', 'Manage integrations', 'integrations');

-- Set default role permissions (owner gets all)
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'owner', id FROM public.permissions;

-- Admin permissions (all except delete project)
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'admin', id FROM public.permissions
WHERE name != 'delete_project';

-- Editor permissions (can edit but not delete)
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'editor', id FROM public.permissions
WHERE category IN ('database', 'data', 'reports')
AND name NOT LIKE '%delete%';

-- Viewer permissions (read-only)
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'viewer', id FROM public.permissions
WHERE name LIKE 'view_%' OR name = 'export_data';

-- Create comments table
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id UUID REFERENCES public.databases(id) ON DELETE CASCADE NOT NULL,
  row_id UUID,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  mentions UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- RLS policies for comments
CREATE POLICY "Users can view comments in accessible databases"
ON public.comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.databases d
    LEFT JOIN public.projects p ON d.project_id = p.id
    WHERE d.id = comments.database_id
    AND (d.user_id = auth.uid() OR p.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
    ))
  )
);

CREATE POLICY "Users can create comments in accessible databases"
ON public.comments
FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.databases d
    LEFT JOIN public.projects p ON d.project_id = p.id
    WHERE d.id = comments.database_id
    AND (d.user_id = auth.uid() OR p.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
    ))
  )
);

CREATE POLICY "Users can update own comments"
ON public.comments
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own comments"
ON public.comments
FOR DELETE
USING (user_id = auth.uid());

-- Create activities table
CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  database_id UUID REFERENCES public.databases(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- RLS policies for activities
CREATE POLICY "Users can view activities in their projects"
ON public.activities
FOR SELECT
USING (
  project_id IS NULL OR EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = activities.project_id
    AND (p.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
    ))
  )
);

-- Create notification preferences table
CREATE TABLE public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email_enabled BOOLEAN DEFAULT true,
  telegram_enabled BOOLEAN DEFAULT false,
  mentions_enabled BOOLEAN DEFAULT true,
  comments_enabled BOOLEAN DEFAULT true,
  reports_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies for notification preferences
CREATE POLICY "Users can manage own notification preferences"
ON public.notification_preferences
FOR ALL
USING (user_id = auth.uid());

-- Create trigger to auto-create notification preferences
CREATE OR REPLACE FUNCTION public.create_notification_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_user_created_notification_prefs
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.create_notification_preferences();

-- Add updated_at trigger for comments
CREATE TRIGGER update_comments_updated_at
BEFORE UPDATE ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add updated_at trigger for user_roles
CREATE TRIGGER update_user_roles_updated_at
BEFORE UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add updated_at trigger for notification_preferences
CREATE TRIGGER update_notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();