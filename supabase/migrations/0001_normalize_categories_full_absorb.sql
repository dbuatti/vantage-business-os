-- ============================================================================
-- Category normalization + "full absorb" fold (CAT2 -> CAT1)
-- Run in the Supabase SQL Editor.
-- Idempotent: safe to run more than once.
-- Uses a VIEW (not scratch tables) so it survives the Supabase SQL Editor's
-- per-statement auto-commit. No DO blocks (editor splits on internal semicolons).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0) Mapping view: (old) stored value -> (new) canonical category + group.
--    Case-insensitive matching is done at UPDATE time; `old` just needs the
--    right spelling. View persists until dropped at the end.
-- ----------------------------------------------------------------------------
DROP VIEW IF EXISTS _cat_fix;
CREATE OR REPLACE VIEW _cat_fix AS
SELECT 'groc'::text                      AS old, 'Groceries'::text              AS new, 'Sustenance'::text              AS grp
UNION ALL SELECT 'grocery',                    'Groceries',                   'Sustenance'
UNION ALL SELECT 'groceries',                 'Groceries',                   'Sustenance'
UNION ALL SELECT 'meal',                      'Meal',                        'Sustenance'
UNION ALL SELECT 'meal (fun)',                'Meal',                        'Sustenance'
UNION ALL SELECT 'meal (uber eats)',          'Meal',                        'Sustenance'
UNION ALL SELECT 'meal (freelance)',           'Meal',                        'Sustenance'
UNION ALL SELECT 'meal (be you)',             'Meal',                        'Sustenance'
UNION ALL SELECT 'meal (bluerock)',           'Meal',                        'Sustenance'
UNION ALL SELECT 'meal (gig)',                'Meal',                        'Sustenance'
UNION ALL SELECT 'meal (brad)',               'Meal',                        'Sustenance'
UNION ALL SELECT 'food & drink',              'Meal',                        'Sustenance'
UNION ALL SELECT 'coff',                      'Coffee',                      'Sustenance'
UNION ALL SELECT 'coffee',                    'Coffee',                      'Sustenance'
UNION ALL SELECT 'take out',                  'Takeaway',                    'Sustenance'
UNION ALL SELECT 'takeout',                   'Takeaway',                    'Sustenance'
UNION ALL SELECT 'indulgence',                'Treat',                       'Sustenance'
UNION ALL SELECT 'printing & stationary',     'Printing & Stationery',        'Flexible Essentials'
UNION ALL SELECT 'hobbie',                    'Hobby',                       'Wellness & Growth'
UNION ALL SELECT 'software',                  'Technology',                  'Wellness & Growth'
UNION ALL SELECT 'technology',                'Technology',                  'Wellness & Growth'
UNION ALL SELECT 'music (technology)',        'Technology',                  'Wellness & Growth'
UNION ALL SELECT 'apple',                     'Technology',                  'Wellness & Growth'
UNION ALL SELECT 'theatre',                   'Theatre/Entertainment',       'Lifestyle & Discretionary'
UNION ALL SELECT 'accountant',                'Accountant',                  'Business'
UNION ALL SELECT 'ato',                       'ATO',                         'Business'
UNION ALL SELECT 'business',                  'Business',                   'Business'
UNION ALL SELECT 'marketing',                 'Marketing',                   'Business'
UNION ALL SELECT 'google ads',                'Google Ads',                   'Business'
UNION ALL SELECT 'vibecoding',                'Vibecoding',                  'Business'
UNION ALL SELECT 'paying musicians',          'Paying Musicians',            'Business'
UNION ALL SELECT 'choir (expenses)',          'Choir (Expenses)',            'Business'
UNION ALL SELECT 'sheet music',               'Sheet Music',                 'Business'
UNION ALL SELECT 'clothes (gig)',             'Clothes (Gig)',              'Business'
UNION ALL SELECT 'beauty (gig)',              'Beauty (Gig)',              'Business'
UNION ALL SELECT 'food & drink (gig)',        'Food & Drink (Gig)',          'Business'
UNION ALL SELECT 'kinesiology (income)',      'Kinesiology (Income)',        'Income'
UNION ALL SELECT 'brad (repayment)',          'Brad (repayment)',           'Flexible Essentials'
UNION ALL SELECT 'car uncle greg',            'Car Uncle Greg',             'Flexible Essentials'
UNION ALL SELECT 'bills',                     'Bills',                       'Fixed Essentials'
UNION ALL SELECT 'internet',                  'Bills',                       'Fixed Essentials'
UNION ALL SELECT 'electricity',               'Bills',                       'Fixed Essentials'
UNION ALL SELECT 'gas',                       'Bills',                       'Fixed Essentials'
UNION ALL SELECT 'subscription',              'Subscription',               'Fixed Essentials'
UNION ALL SELECT 'rent',                      'Rent',                        'Fixed Essentials'
UNION ALL SELECT 'phone',                     'Phone',                       'Fixed Essentials'
UNION ALL SELECT 'fees',                      'Fees',                        'Fixed Essentials'
UNION ALL SELECT 'rego',                      'Rego',                        'Fixed Essentials'
UNION ALL SELECT 'dentist',                   'Dentist',                     'Flexible Essentials'
UNION ALL SELECT 'home',                      'Home',                        'Flexible Essentials'
UNION ALL SELECT 'fines',                     'Fines',                       'Flexible Essentials'
UNION ALL SELECT 'fuel',                      'Fuel',                        'Flexible Essentials'
UNION ALL SELECT 'car',                       'Car',                         'Flexible Essentials'
UNION ALL SELECT 'myki',                      'Myki',                        'Flexible Essentials'
UNION ALL SELECT 'tolls',                     'Tolls',                       'Flexible Essentials'
UNION ALL SELECT 'parking',                   'Parking',                     'Flexible Essentials'
UNION ALL SELECT 'maintenance',               'Maintenance',                 'Flexible Essentials'
UNION ALL SELECT 'doctor',                    'Doctor',                      'Flexible Essentials'
UNION ALL SELECT 'medicine',                  'Medicine',                    'Flexible Essentials'
UNION ALL SELECT 'drinks',                    'Drinks',                      'Sustenance'
UNION ALL SELECT 'treat',                     'Treat',                       'Sustenance'
UNION ALL SELECT 'coffee + banana',           'Coffee + banana',             'Sustenance'
UNION ALL SELECT 'health',                    'Health',                      'Wellness & Growth'
UNION ALL SELECT 'fitness',                   'Fitness',                     'Wellness & Growth'
UNION ALL SELECT 'wellbeing',                 'Wellbeing',                   'Wellness & Growth'
UNION ALL SELECT 'yoga',                      'Yoga',                        'Wellness & Growth'
UNION ALL SELECT 'kinesiology',               'Kinesiology',                 'Wellness & Growth'
UNION ALL SELECT 'books',                     'Books',                       'Wellness & Growth'
UNION ALL SELECT 'study',                     'Study',                       'Wellness & Growth'
UNION ALL SELECT 'piano lessons',             'Piano lessons',              'Wellness & Growth'
UNION ALL SELECT 'vca expense',               'VCA Expense',                'Wellness & Growth'
UNION ALL SELECT 'games',                     'Games',                       'Lifestyle & Discretionary'
UNION ALL SELECT 'travel',                    'Travel',                      'Lifestyle & Discretionary'
UNION ALL SELECT 'recreation',                'Recreation',                  'Lifestyle & Discretionary'
UNION ALL SELECT 'clothes',                   'Clothes',                     'Lifestyle & Discretionary'
UNION ALL SELECT 'beauty',                    'Beauty',                     'Lifestyle & Discretionary'
UNION ALL SELECT 'cosmetics',                 'Cosmetics',                  'Lifestyle & Discretionary'
UNION ALL SELECT 'going out',                 'Going out',                   'Lifestyle & Discretionary'
UNION ALL SELECT 'fun',                       'Fun',                         'Lifestyle & Discretionary'
UNION ALL SELECT 'uber',                      'Uber',                        'Lifestyle & Discretionary'
UNION ALL SELECT 'holiday',                   'Holiday',                     'Lifestyle & Discretionary'
UNION ALL SELECT 'gift',                      'Gift',                        'Lifestyle & Discretionary'
UNION ALL SELECT 'theatre/entertainment',     'Theatre/Entertainment',       'Lifestyle & Discretionary'
UNION ALL SELECT 'broadway unplugged',        'Broadway Unplugged',          'Lifestyle & Discretionary'
UNION ALL SELECT 'music',                     'Music',                       'Lifestyle & Discretionary'
UNION ALL SELECT 'misc',                      'Misc',                        'Lifestyle & Discretionary';

-- NOTE ON 'account':
--   "Account" = moving money between your own accounts, not real spend.
--   Deliberately NOT in _cat_fix and NOT mapped to any spend category.

-- NOTE ON 'Kinesiology (Income)':
--   Business income, not an expense. Mapped to 'Income' group (separate
--   from 'Business' which is expenses) so it never gets summed into spend.

-- Optional conflict check (uncomment to run):
-- SELECT new, count(DISTINCT grp) AS groups FROM _cat_fix GROUP BY new HAVING count(DISTINCT grp) > 1;

-- ----------------------------------------------------------------------------
-- Pre-flight backup (IF NOT EXISTS so re-runs don't overwrite the original).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.finance_transactions_backup_20260803 AS
SELECT * FROM public.finance_transactions;

-- ============================================================================
-- 1) Rewrite category_1 to the canonical value (merge typos / variants).
-- ============================================================================
UPDATE public.finance_transactions AS t
SET category_1 = f.new
FROM _cat_fix AS f
WHERE btrim(lower(btrim(t.category_1))) = lower(btrim(f.old))
  AND f.new IS DISTINCT FROM f.old
  AND f.new IS DISTINCT FROM NULLIF(btrim(t.category_1), '');

-- ============================================================================
-- 2) Rewrite category_2 the same way (kept only as detail, normalised case).
-- ============================================================================
UPDATE public.finance_transactions AS t
SET category_2 = f.new
FROM _cat_fix f
WHERE t.category_2 IS NOT NULL
  AND btrim(lower(btrim(t.category_2))) = lower(btrim(f.old))
  AND f.new IS DISTINCT FROM f.old
  AND f.new IS DISTINCT FROM NULLIF(btrim(t.category_2), '');

-- ============================================================================
-- 3) Fold a meaningful category_2 up into category_1 when category_1 is
--    blank or 'uncategorized'. 'Account' is intentionally excluded.
-- ============================================================================
UPDATE public.finance_transactions AS t
SET category_1 = t.category_2,
    category_2 = NULL
WHERE (btrim(coalesce(t.category_1, '')) = ''
       OR lower(btrim(coalesce(t.category_1, ''))) = 'uncategorized')
  AND btrim(coalesce(t.category_2, '')) <> '';

-- ============================================================================
-- 4) Sync category -> group for the managed canonical categories.
-- ============================================================================
INSERT INTO public.category_groups (user_id, category_name, group_name)
SELECT DISTINCT t.user_id, c.category_name, c.group_name
FROM (SELECT DISTINCT ON (new) new AS category_name, grp AS group_name FROM _cat_fix ORDER BY new) c
CROSS JOIN (SELECT DISTINCT user_id FROM public.finance_transactions) su
ON CONFLICT (user_id, category_name)
DO UPDATE SET group_name = EXCLUDED.group_name;

-- ----------------------------------------------------------------------------
-- Cleanup view (backup table is kept).
-- ----------------------------------------------------------------------------
DROP VIEW IF EXISTS _cat_fix;

-- ----------------------------------------------------------------------------
-- Preview (uncomment to eyeball after running):
-- SELECT category_1, count(*) FROM public.finance_transactions
-- GROUP BY 1 ORDER BY 2 DESC;