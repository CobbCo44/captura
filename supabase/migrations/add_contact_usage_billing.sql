-- Brand plans bill per new opted-in contact (one per person, counted once).
-- An hourly job reports new contacts to Stripe and stamps them here so a
-- contact is never billed twice.
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS usage_reported_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS contacts_unreported_idx
  ON contacts (brand_id, created_at) WHERE usage_reported_at IS NULL;

-- Start of the current Stripe billing month, for the "contacts this month" meter
ALTER TABLE brands ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ;
