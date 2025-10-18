-- Fix remaining functions without search_path settings

-- Update get_database function
CREATE OR REPLACE FUNCTION public.get_database(p_id uuid)
RETURNS databases
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.* FROM public.databases d
  WHERE d.id = p_id
  LIMIT 1;
$$;

-- Update get_user_databases function
CREATE OR REPLACE FUNCTION public.get_user_databases(p_user_id uuid)
RETURNS SETOF databases
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.databases
  WHERE user_id = p_user_id
  ORDER BY created_at DESC;
$$;