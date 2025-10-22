-- Drop existing transactions table to rebuild with proper structure
DROP TABLE IF EXISTS public.transactions CASCADE;

-- Create orders table (main table for all orders)
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  operator_code TEXT,
  goods_name TEXT,
  flavour_name TEXT,
  order_resource TEXT,
  order_type TEXT,
  order_status TEXT,
  cup_type INTEGER,
  machine_code TEXT,
  address TEXT,
  order_price NUMERIC,
  brew_status TEXT,
  creation_time TIMESTAMP WITH TIME ZONE,
  paying_time TIMESTAMP WITH TIME ZONE,
  brewing_time TIMESTAMP WITH TIME ZONE,
  delivery_time TIMESTAMP WITH TIME ZONE,
  refund_time TIMESTAMP WITH TIME ZONE,
  pay_card TEXT,
  reason TEXT,
  remark TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create upload_log table (file upload history)
CREATE TABLE public.upload_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  upload_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  total_rows INTEGER DEFAULT 0,
  new_records INTEGER DEFAULT 0,
  duplicate_records INTEGER DEFAULT 0,
  error_records INTEGER DEFAULT 0,
  processing_time_seconds NUMERIC,
  status TEXT DEFAULT 'success',
  error_message TEXT,
  file_size_bytes INTEGER,
  notes TEXT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create database_metadata table (system metadata)
CREATE TABLE public.database_metadata (
  key TEXT PRIMARY KEY,
  value TEXT,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upload_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.database_metadata ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES: orders
-- Users can only view and manage their own orders
-- ============================================================================
CREATE POLICY "Users can view their own orders"
  ON public.orders FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "Users can insert their own orders"
  ON public.orders FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own orders"
  ON public.orders FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own orders"
  ON public.orders FOR DELETE
  USING (created_by = auth.uid());

-- ============================================================================
-- RLS POLICIES: upload_log
-- Users can only view their own upload logs
-- ============================================================================
CREATE POLICY "Users can view their own upload logs"
  ON public.upload_log FOR SELECT
  USING (uploaded_by = auth.uid());

CREATE POLICY "Users can insert upload logs"
  ON public.upload_log FOR INSERT
  WITH CHECK (uploaded_by = auth.uid());

-- ============================================================================
-- RLS POLICIES: database_metadata
-- Read-only for authenticated users, write for service role only
-- ============================================================================
CREATE POLICY "Authenticated users can view metadata"
  ON public.database_metadata FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can insert metadata"
  ON public.database_metadata FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update metadata"
  ON public.database_metadata FOR UPDATE
  USING (auth.role() = 'service_role');

-- Create indexes for orders table for fast searching
CREATE INDEX idx_order_number ON public.orders(order_number);
CREATE INDEX idx_creation_time ON public.orders(creation_time);
CREATE INDEX idx_machine_code ON public.orders(machine_code);
CREATE INDEX idx_order_resource ON public.orders(order_resource);
CREATE INDEX idx_order_status ON public.orders(order_status);
CREATE INDEX idx_goods_name ON public.orders(goods_name);

-- RLS optimization indexes
CREATE INDEX idx_orders_created_by ON public.orders(created_by);
CREATE INDEX idx_upload_log_uploaded_by ON public.upload_log(uploaded_by);

-- Create indexes for upload_log
CREATE INDEX idx_upload_date ON public.upload_log(upload_date);

-- Insert initial metadata
INSERT INTO public.database_metadata (key, value, description) VALUES
  ('schema_version', '1.0', 'Database schema version'),
  ('created_at', now()::text, 'Database creation timestamp'),
  ('total_orders', '0', 'Total number of orders in database');