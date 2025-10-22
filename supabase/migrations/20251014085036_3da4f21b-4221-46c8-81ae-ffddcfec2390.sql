-- Create table for storing transactions
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT NOT NULL,
  row_hash TEXT NOT NULL,
  row_data JSONB NOT NULL,
  date_iso TEXT,
  date_only TEXT,
  amount_num NUMERIC,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(row_hash)
);

-- Enable Row Level Security
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES: transactions
-- Users can only view and manage their own transactions
-- ============================================================================
CREATE POLICY "Users can view their own transactions"
  ON public.transactions FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "Users can insert their own transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own transactions"
  ON public.transactions FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own transactions"
  ON public.transactions FOR DELETE
  USING (created_by = auth.uid());

-- Create index for faster duplicate checks
CREATE INDEX idx_transactions_row_hash ON public.transactions(row_hash);
CREATE INDEX idx_transactions_date_only ON public.transactions(date_only);
CREATE INDEX idx_transactions_file_name ON public.transactions(file_name);

-- RLS optimization index
CREATE INDEX idx_transactions_created_by ON public.transactions(created_by);