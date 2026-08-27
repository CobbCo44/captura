-- Stripe billing state on brands. Written only by the stripe-webhook
-- function (service role); the dashboard reads it.
-- subscription_status: trialing | active | past_due | canceled.
-- NULL = never entered billing (founding free ride, nothing gated).
ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS billing_updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_brands_stripe_customer ON brands (stripe_customer_id);
