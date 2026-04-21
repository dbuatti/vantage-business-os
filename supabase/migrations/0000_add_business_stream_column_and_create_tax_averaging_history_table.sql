-- Add business_stream to finance_transactions
ALTER TABLE finance_transactions ADD COLUMN business_stream TEXT DEFAULT 'Other';

-- Create tax_averaging_history table
CREATE TABLE public.tax_averaging_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, year)
);

-- Enable RLS
ALTER TABLE public.tax_averaging_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own tax averaging history" ON public.tax_averaging_history
FOR ALL TO authenticated USING (auth.uid() = user_id);