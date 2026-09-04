-- 'free_year' promo codes (e.g. SNAPCAP26) now grant access directly with no
-- Square charge at all, instead of charging then refunding. This column
-- tracks when that free year runs out, so the app can drop back to the
-- paywall at that point without ever having billed the customer.
ALTER TABLE public.subscriptions
  ADD COLUMN free_access_until TIMESTAMP WITH TIME ZONE;
