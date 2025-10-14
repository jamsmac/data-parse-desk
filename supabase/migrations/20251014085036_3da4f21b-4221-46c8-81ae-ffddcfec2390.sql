-- Create table for storing transactions
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT NOT NULL,
  row_hash TEXT NOT NULL,
  row_data JSONB NOT NULL,
  date_iso TEXT,
  date_only TEXT,
  amount_num NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(row_hash)
);

-- Enable Row Level Security
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to read (public data)
CREATE POLICY "Anyone can view transactions" 
ON public.transactions 
FOR SELECT 
USING (true);

-- Create policy to allow anyone to insert (public data)
CREATE POLICY "Anyone can insert transactions" 
ON public.transactions 
FOR INSERT 
WITH CHECK (true);

-- Create index for faster duplicate checks
CREATE INDEX idx_transactions_row_hash ON public.transactions(row_hash);
CREATE INDEX idx_transactions_date_only ON public.transactions(date_only);
CREATE INDEX idx_transactions_file_name ON public.transactions(file_name);