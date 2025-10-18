-- Enable password protection and complexity requirements
-- Note: These are auth schema configurations that should be set via Supabase dashboard

-- Add password strength validation function
CREATE OR REPLACE FUNCTION public.validate_password_strength(password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Minimum 8 characters
  IF LENGTH(password) < 8 THEN
    RETURN FALSE;
  END IF;
  
  -- At least one uppercase letter
  IF password !~ '[A-Z]' THEN
    RETURN FALSE;
  END IF;
  
  -- At least one lowercase letter
  IF password !~ '[a-z]' THEN
    RETURN FALSE;
  END IF;
  
  -- At least one digit
  IF password !~ '[0-9]' THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Create function to check if password has been used before (prevent reuse)
CREATE TABLE IF NOT EXISTS public.password_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on password_history
ALTER TABLE public.password_history ENABLE ROW LEVEL SECURITY;

-- Only system can manage password history
CREATE POLICY "System manages password history"
  ON public.password_history
  FOR ALL
  USING (FALSE);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_password_history_user_id 
  ON public.password_history(user_id);

-- Create trigger to clean old password history (keep last 5)
CREATE OR REPLACE FUNCTION public.cleanup_old_passwords()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.password_history
  WHERE user_id = NEW.user_id
    AND id NOT IN (
      SELECT id FROM public.password_history
      WHERE user_id = NEW.user_id
      ORDER BY created_at DESC
      LIMIT 5
    );
  RETURN NEW;
END;
$$;

CREATE TRIGGER cleanup_password_history_trigger
  AFTER INSERT ON public.password_history
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_old_passwords();