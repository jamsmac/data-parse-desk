-- Update create_database function to support project_id
CREATE OR REPLACE FUNCTION public.create_database(
  name text, 
  user_id uuid, 
  description text DEFAULT NULL::text, 
  icon text DEFAULT NULL::text, 
  color text DEFAULT NULL::text,
  project_id uuid DEFAULT NULL::uuid
)
RETURNS databases
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  new_db public.databases;
BEGIN
  INSERT INTO public.databases(name, description, icon, color, user_id, project_id)
  VALUES (name, description, icon, color, user_id, project_id)
  RETURNING * INTO new_db;
  RETURN new_db;
END;
$function$;