-- Self-serve signup: lead capture, tier, and terms acceptance on brands.
-- owner_name / owner_phone are the account owner's direct contact
-- (distinct from store_phone, which is the public storefront number).
-- A signup that stalls before setup is still a callable warm lead.
ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS owner_name TEXT,
  ADD COLUMN IF NOT EXISTS owner_phone TEXT,
  ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'starter'
    CHECK (tier IN ('starter', 'growth', 'pro')),
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS terms_version TEXT;
