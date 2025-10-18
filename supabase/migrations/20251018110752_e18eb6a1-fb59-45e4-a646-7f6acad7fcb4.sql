-- Drop old function and create new one with database_count
DROP FUNCTION IF EXISTS public.get_user_projects(uuid);

CREATE OR REPLACE FUNCTION public.get_user_projects(p_user_id uuid)
RETURNS TABLE(
  id uuid,
  name text,
  description text,
  icon text,
  color text,
  user_id uuid,
  is_archived boolean,
  created_at timestamptz,
  updated_at timestamptz,
  settings jsonb,
  database_count bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT DISTINCT 
    p.id,
    p.name,
    p.description,
    p.icon,
    p.color,
    p.user_id,
    p.is_archived,
    p.created_at,
    p.updated_at,
    p.settings,
    (SELECT COUNT(*) FROM public.databases d WHERE d.project_id = p.id) as database_count
  FROM public.projects p
  LEFT JOIN public.project_members pm ON p.id = pm.project_id
  WHERE p.user_id = p_user_id OR pm.user_id = p_user_id
  ORDER BY p.created_at DESC;
$function$;