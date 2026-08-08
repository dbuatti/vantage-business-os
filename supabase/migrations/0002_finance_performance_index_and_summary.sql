-- ============================================================================
-- Finance performance: index + server-side aggregation function.
-- Run in the Supabase SQL Editor.
-- Idempotent: safe to run more than once.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Index for date-range scans on finance_transactions.
--    Speeds up the recurring date-range filter used by Master Tracker,
--    Insights, BudgetDialog and the dashboard.
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_ft_transaction_date
  ON public.finance_transactions (transaction_date);

-- ----------------------------------------------------------------------------
-- 2) finance_summary(start_date, end_date)
--    Returns per-category income/expense totals instead of raw ledger rows,
--    so client-side code stops pulling every transaction just to sum it.
--    Call via supabase.rpc('finance_summary', { start_date, end_date }).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.finance_summary(start_date date, end_date date)
RETURNS TABLE (
  category_1 text,
  income numeric,
  expense numeric,
  txn_count bigint
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    category_1,
    SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END)::numeric AS income,
    SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END)::numeric AS expense,
    COUNT(*)::bigint AS txn_count
  FROM public.finance_transactions
  WHERE transaction_date BETWEEN start_date AND end_date
    AND category_1 IS DISTINCT FROM 'Account'
  GROUP BY category_1
$$;

GRANT EXECUTE ON FUNCTION public.finance_summary(date, date) TO authenticated;
