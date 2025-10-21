-- Create admin RPC functions for user management and statistics

-- Function to get all users with their stats (admin only)
CREATE OR REPLACE FUNCTION public.admin_get_users(
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  email TEXT,
  created_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  role app_role,
  free_credits NUMERIC,
  paid_credits NUMERIC,
  total_credits_used NUMERIC,
  projects_count BIGINT,
  databases_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  RETURN QUERY
  SELECT 
    au.id,
    au.email,
    au.created_at,
    au.last_sign_in_at,
    COALESCE(ur.role, 'user'::app_role) as role,
    COALESCE(uc.free_credits, 0) as free_credits,
    COALESCE(uc.paid_credits, 0) as paid_credits,
    COALESCE(uc.total_credits_used, 0) as total_credits_used,
    (SELECT COUNT(*) FROM projects p WHERE p.user_id = au.id) as projects_count,
    (SELECT COUNT(*) FROM databases d WHERE d.user_id = au.id) as databases_count
  FROM auth.users au
  LEFT JOIN user_roles ur ON au.id = ur.user_id
  LEFT JOIN user_credits uc ON au.id = uc.user_id
  ORDER BY au.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Function to assign role to user (admin only)
CREATE OR REPLACE FUNCTION public.admin_assign_role(
  p_user_id UUID,
  p_role app_role
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  -- Insert or update role
  INSERT INTO user_roles (user_id, role)
  VALUES (p_user_id, p_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Remove other roles for this user
  DELETE FROM user_roles 
  WHERE user_id = p_user_id AND role != p_role;

  RETURN TRUE;
END;
$$;

-- Function to adjust user credits (admin only)
CREATE OR REPLACE FUNCTION public.admin_adjust_credits(
  p_user_id UUID,
  p_free_credits_delta NUMERIC DEFAULT 0,
  p_paid_credits_delta NUMERIC DEFAULT 0,
  p_description TEXT DEFAULT 'Admin adjustment'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_free_credits NUMERIC;
  v_new_paid_credits NUMERIC;
BEGIN
  -- Check if caller is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  -- Update credits
  UPDATE user_credits
  SET 
    free_credits = free_credits + p_free_credits_delta,
    paid_credits = paid_credits + p_paid_credits_delta,
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING free_credits, paid_credits INTO v_new_free_credits, v_new_paid_credits;

  -- If user doesn't have credits record, create one
  IF NOT FOUND THEN
    INSERT INTO user_credits (user_id, free_credits, paid_credits)
    VALUES (p_user_id, p_free_credits_delta, p_paid_credits_delta)
    RETURNING free_credits, paid_credits INTO v_new_free_credits, v_new_paid_credits;
  END IF;

  -- Log transaction
  INSERT INTO credit_transactions (
    user_id,
    transaction_type,
    amount,
    balance_after,
    description,
    operation_type
  )
  VALUES (
    p_user_id,
    CASE WHEN p_free_credits_delta > 0 OR p_paid_credits_delta > 0 THEN 'credit' ELSE 'debit' END,
    ABS(p_free_credits_delta + p_paid_credits_delta),
    v_new_free_credits + v_new_paid_credits,
    p_description,
    'admin_adjustment'
  );

  RETURN TRUE;
END;
$$;

-- Function to get system statistics (admin only)
CREATE OR REPLACE FUNCTION public.admin_get_stats()
RETURNS TABLE(
  total_users BIGINT,
  active_users_7d BIGINT,
  active_users_30d BIGINT,
  total_projects BIGINT,
  total_databases BIGINT,
  total_ai_requests BIGINT,
  ai_requests_today BIGINT,
  total_credits_used NUMERIC,
  credits_used_today NUMERIC,
  avg_credits_per_user NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM auth.users)::BIGINT as total_users,
    (SELECT COUNT(DISTINCT id) FROM auth.users WHERE last_sign_in_at > NOW() - INTERVAL '7 days')::BIGINT as active_users_7d,
    (SELECT COUNT(DISTINCT id) FROM auth.users WHERE last_sign_in_at > NOW() - INTERVAL '30 days')::BIGINT as active_users_30d,
    (SELECT COUNT(*) FROM projects)::BIGINT as total_projects,
    (SELECT COUNT(*) FROM databases)::BIGINT as total_databases,
    (SELECT COUNT(*) FROM ai_requests)::BIGINT as total_ai_requests,
    (SELECT COUNT(*) FROM ai_requests WHERE created_at::DATE = CURRENT_DATE)::BIGINT as ai_requests_today,
    (SELECT COALESCE(SUM(total_credits_used), 0) FROM user_credits) as total_credits_used,
    (SELECT COALESCE(SUM(amount), 0) FROM credit_transactions WHERE created_at::DATE = CURRENT_DATE AND transaction_type = 'debit') as credits_used_today,
    (SELECT COALESCE(AVG(total_credits_used), 0) FROM user_credits WHERE total_credits_used > 0) as avg_credits_per_user;
END;
$$;