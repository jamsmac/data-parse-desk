-- =====================================================================
-- Migration: Auto-grant 100 credits on user registration
-- Description: Automatically grants 100 free credits to new users
-- =====================================================================

-- Function to grant registration credits
CREATE OR REPLACE FUNCTION public.grant_registration_credits()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert 100 credits for new user
  INSERT INTO public.user_credits (user_id, balance)
  VALUES (NEW.id, 100)
  ON CONFLICT (user_id) DO NOTHING;

  -- Log the transaction
  INSERT INTO public.credit_transactions (
    user_id,
    amount,
    type,
    description,
    created_at
  ) VALUES (
    NEW.id,
    100,
    'grant',
    'Welcome bonus: 100 free credits on registration',
    NOW()
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail user creation
  RAISE WARNING 'Failed to grant registration credits for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS grant_registration_credits_trigger ON auth.users;

-- Create trigger on user registration
CREATE TRIGGER grant_registration_credits_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.grant_registration_credits();

-- Grant 100 credits to existing users who don't have any credits yet
DO $$
DECLARE
  user_record RECORD;
  affected_count INTEGER := 0;
BEGIN
  FOR user_record IN
    SELECT id
    FROM auth.users
    WHERE id NOT IN (SELECT user_id FROM public.user_credits)
  LOOP
    -- Insert credits
    INSERT INTO public.user_credits (user_id, balance)
    VALUES (user_record.id, 100)
    ON CONFLICT (user_id) DO NOTHING;

    -- Log transaction
    INSERT INTO public.credit_transactions (
      user_id,
      amount,
      type,
      description,
      created_at
    ) VALUES (
      user_record.id,
      100,
      'grant',
      'Retroactive welcome bonus: 100 free credits',
      NOW()
    );

    affected_count := affected_count + 1;
  END LOOP;

  RAISE NOTICE 'Granted 100 credits to % existing users', affected_count;
END $$;

-- Add comment
COMMENT ON FUNCTION public.grant_registration_credits() IS
  'Automatically grants 100 free credits to newly registered users';

-- Verify trigger is active
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'grant_registration_credits_trigger'
  ) THEN
    RAISE NOTICE '✓ Registration credits trigger is active';
  ELSE
    RAISE WARNING '✗ Registration credits trigger failed to create';
  END IF;
END $$;
