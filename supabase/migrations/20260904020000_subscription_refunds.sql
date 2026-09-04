-- Tracks the most recent payment on a subscription so a self-service
-- cancel-and-refund request doesn't have to re-derive the payment_id from
-- Square at cancel time (the webhook resolves and stores it as soon as the
-- payment posts). refunded_at prevents double-refunding the same
-- subscription if cancel is somehow called twice.
ALTER TABLE public.subscriptions
  ADD COLUMN last_payment_id TEXT,
  ADD COLUMN last_payment_amount_cents INTEGER,
  ADD COLUMN refunded_at TIMESTAMP WITH TIME ZONE;
