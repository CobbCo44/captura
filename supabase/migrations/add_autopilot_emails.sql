-- Unified send log for ALL automated email flows.
-- Replaces reward_emails_sent as the single source of truth.
-- Existing reward_emails_sent records are migrated in, then a view
-- bridges old code that still reads reward_emails_sent.

-- 1. Create the unified table
CREATE TABLE IF NOT EXISTS autopilot_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE NOT NULL,
  flow TEXT NOT NULL,  -- 'reward_ready', 'welcome', 'winback'
  outcome TEXT NOT NULL,  -- 'sent', 'skipped_no_consent', 'skipped_dedup', 'skipped_disabled', 'error'
  error_detail TEXT,
  -- Reward-specific (null for non-reward flows)
  reward_id UUID REFERENCES loyalty_rewards(id) ON DELETE SET NULL,
  balance_at_send INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_autopilot_emails_contact_brand
  ON autopilot_emails (contact_id, brand_id, flow, created_at);

CREATE INDEX idx_autopilot_emails_brand_flow
  ON autopilot_emails (brand_id, flow, created_at);

-- Dedup index for reward_ready: one successful send per (contact, brand, reward)
CREATE INDEX idx_autopilot_dedup_reward
  ON autopilot_emails (contact_id, brand_id, reward_id)
  WHERE flow = 'reward_ready' AND outcome = 'sent';

-- Dedup index for welcome: one per (contact, brand)
CREATE UNIQUE INDEX idx_autopilot_dedup_welcome
  ON autopilot_emails (contact_id, brand_id)
  WHERE flow = 'welcome' AND outcome = 'sent';

-- Dedup index for winback: latest per (contact, brand) for 60-day cooldown
CREATE INDEX idx_autopilot_dedup_winback
  ON autopilot_emails (contact_id, brand_id, created_at)
  WHERE flow = 'winback' AND outcome = 'sent';

ALTER TABLE autopilot_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brand owners read own autopilot emails" ON autopilot_emails
  FOR SELECT USING (brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid()));

-- 2. Migrate existing reward_emails_sent data
INSERT INTO autopilot_emails (contact_id, brand_id, flow, outcome, error_detail, reward_id, balance_at_send, created_at)
SELECT
  contact_id,
  brand_id,
  'reward_ready',
  CASE
    WHEN error IS NULL AND consent_had = true THEN 'sent'
    WHEN consent_had = false THEN 'skipped_no_consent'
    WHEN error IS NOT NULL THEN 'error'
    ELSE 'sent'
  END,
  error,
  reward_id,
  balance_at_send,
  sent_at
FROM reward_emails_sent;

-- 3. Add brand columns for autopilot feature toggles and winback config
ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS autopilot_reward_ready BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS autopilot_welcome BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS autopilot_winback BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS winback_days INTEGER NOT NULL DEFAULT 30;
