-- Billing Events: tracks every consumer data submission for billing
-- $1 per billable submission, with 24-hour dedup per consumer per brand

CREATE TABLE billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE NOT NULL,
  consumer_key TEXT NOT NULL,          -- normalized email or phone for dedup
  source_type TEXT NOT NULL,           -- 'vip', 'promo', 'warranty', 'event'
  source_id UUID,                      -- ID from the source table
  billable BOOLEAN DEFAULT true,
  billing_month TEXT NOT NULL,         -- 'YYYY-MM' for easy grouping
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for billing queries
CREATE INDEX idx_billing_brand ON billing_events(brand_id);
CREATE INDEX idx_billing_month ON billing_events(billing_month);
CREATE INDEX idx_billing_dedup ON billing_events(brand_id, consumer_key, created_at DESC);

-- RLS
ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;

-- Admin can read all (via service role), public can insert
CREATE POLICY "Anyone can create billing event" ON billing_events
  FOR INSERT WITH CHECK (true);

-- Only admins (via service role) or brand owners can view their own
CREATE POLICY "Users view own billing events" ON billing_events
  FOR SELECT USING (brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid()));
