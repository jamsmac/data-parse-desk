-- Fix Critical Security Issues: Add user_id columns and update RLS policies

-- 1. Add user_id to orders table
ALTER TABLE public.orders ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- For existing orders, set a default user (first user in system) or handle manually
-- In production, you'd need to migrate existing data appropriately
UPDATE public.orders SET user_id = (SELECT id FROM auth.users LIMIT 1) WHERE user_id IS NULL;

ALTER TABLE public.orders ALTER COLUMN user_id SET NOT NULL;

-- 2. Drop existing permissive policies on orders
DROP POLICY IF EXISTS "Anyone can view orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can insert orders" ON public.orders;

-- 3. Create secure RLS policies for orders
CREATE POLICY "Users can view own orders" 
ON public.orders 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own orders" 
ON public.orders 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own orders" 
ON public.orders 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own orders" 
ON public.orders 
FOR DELETE 
USING (auth.uid() = user_id);

-- 4. Fix database_metadata table - make it user-scoped
ALTER TABLE public.database_metadata ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- For existing metadata, set default user
UPDATE public.database_metadata SET user_id = (SELECT id FROM auth.users LIMIT 1) WHERE user_id IS NULL;

ALTER TABLE public.database_metadata ALTER COLUMN user_id SET NOT NULL;

-- 5. Drop existing permissive policies on database_metadata
DROP POLICY IF EXISTS "Anyone can insert metadata" ON public.database_metadata;
DROP POLICY IF EXISTS "Anyone can update metadata" ON public.database_metadata;
DROP POLICY IF EXISTS "Anyone can view metadata" ON public.database_metadata;

-- 6. Create secure RLS policies for database_metadata
CREATE POLICY "Users can manage own metadata" 
ON public.database_metadata 
FOR ALL 
USING (auth.uid() = user_id);

-- 7. Add user_id to upload_log as well (bonus fix for completeness)
ALTER TABLE public.upload_log ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

UPDATE public.upload_log SET user_id = (SELECT id FROM auth.users LIMIT 1) WHERE user_id IS NULL;

ALTER TABLE public.upload_log ALTER COLUMN user_id SET NOT NULL;

-- 8. Drop and recreate upload_log policies
DROP POLICY IF EXISTS "Anyone can view upload_log" ON public.upload_log;
DROP POLICY IF EXISTS "Anyone can insert upload_log" ON public.upload_log;

CREATE POLICY "Users can view own upload logs" 
ON public.upload_log 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own upload logs" 
ON public.upload_log 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);