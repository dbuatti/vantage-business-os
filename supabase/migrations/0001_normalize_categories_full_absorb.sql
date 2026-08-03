-- ============================================================================
-- Category normalization + "full absorb" fold (CAT2 -> CAT1)
-- Run in the Supabase SQL Editor (session role bypasses RLS).
-- Idempotent: safe to run more than once.
-- ============================================================================

BEGIN;

-- Fix-up table: (old) stored value -> (new) canonical category + target group.
-- Case is handled at match time; `old` only needs to match spelling/typo.
CREATE TEMP TABLE cat_fix (old TEXT, new TEXT, grp TEXT) ON COMMIT DROP;

INSERT INTO cat_fix(old, new, grp) VALUES
  -- --- spelling / casing / near-duplicate merge -----------------------------
  ('groc',                    'Groceries',             'Sustenance'),
  ('grocery',                 'Groceries',             'Sustenance'),
  ('groceries',               'Groceries',             'Sustenance'),
  ('meal',                    'Meal',                  'Sustenance'),
  ('meal (fun)',              'Meal',                  'Sustenance'),
  ('meal (uber eats)',        'Meal',                  'Sustenance'),
  ('meal (freelance)',        'Meal',                  'Sustenance'),
  ('meal (be you)',            'Meal',                  'Sustenance'),
  ('meal (bluerock)',          'Meal',                  'Sustenance'),
  ('meal (gig)',               'Meal',                  'Sustenance'),
  ('meal (brad)',              'Meal',                  'Sustenance'),
  ('food & drink',             'Meal',                  'Sustenance'),
  ('coff',                     'Coffee',                'Sustenance'),
  ('coffee',                   'Coffee',                'Sustenance'),
  ('take out',                 'Takeaway',              'Sustenance'),
  ('takeout',                  'Takeaway',              'Sustenance'),
  ('indulgence',               'Treat',                 'Sustenance'),
  ('printing & stationary',    'Printing & Stationery', 'Flexible Essentials'),
  ('hobbie',                   'Hobby',                 'Wellness & Growth'),
  ('software',                 'Technology',            'Wellness & Growth'),
  ('technology',               'Technology',            'Wellness & Growth'),
  ('music (technology)',       'Technology',            'Wellness & Growth'),
  -- --- self-employment / musician business costs -> new 'Business' group ----
  ('accountant',               'Accountant',            'Business'),
  ('ato',                      'ATO',                   'Business'),
  ('business',                 'Business',              'Business'),
  ('marketing',                'Marketing',             'Business'),
  ('google ads',               'Google Ads',            'Business'),
  ('vibecoding',               'Vibecoding',            'Business'),
  ('paying musicians',          'Paying Musicians',      'Business'),
  ('choir (expenses)',          'Choir (Expenses)',      'Business'),
  ('sheet music',              'Sheet Music',           'Business'),
  ('clothes (gig)',             'Clothes (Gig)',         'Business'),
  ('beauty (gig)',              'Beauty (Gig)',          'Business'),
  ('food & drink (gig)',        'Food & Drink (Gig)',    'Business'),
  -- --- canonical categories kept (tidy spelling) ------------------------------
  ('bills',                     'Bills',                 'Fixed Essentials'),
  ('internet',                  'Bills',                 'Fixed Essentials'),
  ('electricity',               'Bills',                 'Fixed Essentials'),
  ('gas',                       'Bills',                 'Fixed Essentials'),
  ('subscription',              'Subscription',          'Fixed Essentials'),
  ('rent',                      'Rent',                  'Fixed Essentials'),
  ('phone',                     'Phone',                 'Fixed Essentials'),
  ('fees',                      'Fees',                  'Fixed Essentials'),
  ('rego',                      'Rego',                  'Fixed Essentials'),
  ('dentist',                   'Dentist',               'Flexible Essentials'),
  ('home',                      'Home',                  'Flexible Essentials'),
  ('fines',                     'Fines',                 'Flexible Essentials'),
  ('fuel',                      'Fuel',                  'Flexible Essentials'),
  ('car',                       'Car',                   'Flexible Essentials'),
  ('myki',                      'Myki',                  'Flexible Essentials'),
  ('tolls',                     'Tolls',                 'Flexible Essentials'),
  ('parking',                   'Parking',               'Flexible Essentials'),
  ('maintenance',               'Maintenance',           'Flexible Essentials'),
  ('doctor',                    'Doctor',                'Flexible Essentials'),
  ('medicine',                  'Medicine',              'Flexible Essentials'),
  ('drinks',                    'Drinks',                'Sustenance'),
  ('treat',                     'Treat',                 'Sustenance'),
  ('coffee + banana',            'Coffee + banana',        'Sustenance'),
  ('health',                    'Health',                'Wellness & Growth'),
  ('fitness',                   'Fitness',               'Wellness & Growth'),
  ('wellbeing',                 'Wellbeing',             'Wellness & Growth'),
  ('yoga',                      'Yoga',                  'Wellness & Growth'),
  ('kinesiology',               'Kinesiology',           'Wellness & Growth'),
  ('kinesiology (income)',       'Kinesiology (Income)',  'Wellness & Growth'),
  ('books',                     'Books',                 'Wellness & Growth'),
  ('study',                     'Study',                 'Wellness & Growth'),
  ('piano lessons',              'Piano lessons',          'Wellness & Growth'),
  ('vca expense',               'VCA Expense',            'Wellness & Growth'),
  ('games',                     'Games',                 'Lifestyle & Discretionary'),
  ('travel',                    'Travel',                'Lifestyle & Discretionary'),
  ('recreation',                'Recreation',            'Lifestyle & Discretionary'),
  ('clothes',                   'Clothes',               'Lifestyle & Discretionary'),
  ('beauty',                    'Beauty',                'Lifestyle & Discretionary'),
  ('cosmetics',                 'Cosmetics',             'Lifestyle & Discretionary'),
  ('going out',                 'Going out',             'Lifestyle & Discretionary'),
  ('fun',                       'Fun',                   'Lifestyle & Discretionary'),
  ('uber',                      'Uber',                  'Lifestyle & Discretionary'),
  ('holiday',                   'Holiday',               'Lifestyle & Discretionary'),
  ('gift',                      'Gift',                  'Lifestyle & Discretionary'),
  ('theatre/entertainment',      'Theatre/Entertainment', 'Lifestyle & Discretionary'),
  ('misc',                      'Misc',                  'Lifestyle & Discretionary');

-- Canonical target set for the group table (dedupe by canonical name).
CREATE TEMP TABLE cat_canonical AS
SELECT DISTINCT ON (new) new AS category_name, grp AS group_name
FROM cat_fix
ORDER BY new;

-- ============================================================================
-- 1) Rewrite category_1 to the canonical value (merge typos / variants).
--    Only rows that actually change are updated.
-- ============================================================================
UPDATE public.finance_transactions AS t
SET category_1 = f.new
FROM cat_fix AS f
WHERE btrim(lower(btrim(t.category_1))) = lower(btrim(f.old))
  AND f.new IS DISTINCT FROM f.old
  AND f.new IS DISTINCT FROM NULLIF(btrim(t.category_1), '');

-- ============================================================================
-- 2) Rewrite category_2 the same way (kept only as detail, normalised case).
-- ============================================================================
UPDATE public.finance_transactions AS t
SET category_2 = f.new
FROM cat_fix f
WHERE t.category_2 IS NOT NULL
  AND btrim(lower(btrim(t.category_2))) = lower(btrim(f.old))
  AND f.new IS DISTINCT FROM f.old
  AND f.new IS DISTINCT FROM NULLIF(btrim(t.category_2), '');

-- ============================================================================
-- 3) Fold a meaningful category_2 up into category_1 when category_1 is blank
--    or just an account/transfer marker, so real spend is not hidden in detail.
-- ============================================================================
UPDATE public.finance_transactions AS t
SET category_1 = t.category_2,
    category_2 = NULL
WHERE (btrim(coalesce(t.category_1, '')) = ''
        OR lower(btrim(coalesce(t.category_1, ''))) IN ('account', 'uncategorized'))
  AND btrim(coalesce(t.category_2, '')) <> '';

-- ============================================================================
-- 4) Sync category -> group for the managed canonical categories.
--    Income / unmapped categories already mapped are left untouched.
-- ============================================================================
INSERT INTO public.category_groups (user_id, category_name, group_name)
SELECT DISTINCT u.user_id, c.category_name, c.group_name
FROM cat_canonical c
CROSS JOIN (SELECT DISTINCT user_id FROM public.finance_transactions) u
ON CONFLICT (user_id, category_name)
DO UPDATE SET group_name = EXCLUDED.group_name;

COMMIT;