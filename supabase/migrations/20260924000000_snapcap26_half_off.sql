-- SNAPCAP26 was switched to 'free_year' (full year, no charge) in
-- 20260903020000_free_year_codes.sql. It should instead be a standard
-- 50%-off annual code like BETA50, so revert it back.
UPDATE public.promo_codes SET discount_type = 'half_off' WHERE code = 'SNAPCAP26';
