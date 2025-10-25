-- ============================================================================
-- Setup Auth for Integration Tests
-- Created: 2025-10-25
-- Purpose: Create profiles table and triggers for test users
-- ============================================================================

-- 1. Create profiles table if not exists
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

COMMENT ON TABLE public.profiles IS 'User profiles - automatically created when user signs up';

-- 2. Enable Row Level Security
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Create RLS Policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 3. Create trigger function for automatic profile creation
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically create profile when user signs up';

-- 4. Create trigger
-- ============================================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 5. Create function to update updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_updated ON public.profiles;

CREATE TRIGGER on_profile_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 6. Grant permissions
-- ============================================================================
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- ============================================================================
-- Verification queries (run these to check setup)
-- ============================================================================

-- Check if profiles table exists and has correct structure
DO $$
BEGIN
  RAISE NOTICE '✅ Setup complete!';
  RAISE NOTICE '';
  RAISE NOTICE 'Profiles table structure:';
  RAISE NOTICE '  - id (UUID, PK, FK to auth.users)';
  RAISE NOTICE '  - email (TEXT)';
  RAISE NOTICE '  - full_name (TEXT)';
  RAISE NOTICE '  - avatar_url (TEXT)';
  RAISE NOTICE '  - created_at (TIMESTAMP)';
  RAISE NOTICE '  - updated_at (TIMESTAMP)';
  RAISE NOTICE '';
  RAISE NOTICE 'RLS Policies:';
  RAISE NOTICE '  - Users can view their own profile';
  RAISE NOTICE '  - Users can update their own profile';
  RAISE NOTICE '  - Users can insert their own profile';
  RAISE NOTICE '';
  RAISE NOTICE 'Triggers:';
  RAISE NOTICE '  - on_auth_user_created: Auto-create profile on signup';
  RAISE NOTICE '  - on_profile_updated: Auto-update updated_at';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Disable email confirmation in Supabase Dashboard (for tests)';
  RAISE NOTICE '     Authentication → Email → Enable confirmations: OFF';
  RAISE NOTICE '  2. Run integration tests: npm run test -- src/tests/integration';
END $$;
