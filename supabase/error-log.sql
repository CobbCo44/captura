-- ============================================================
-- Error Log Table
-- Paste this into the Supabase SQL Editor and run.
-- ============================================================

-- Captures client-side and server-side errors for monitoring.
-- Check this table periodically to spot issues.
CREATE TABLE error_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,          -- 'scan_page', 'shopify_sync', 'rate_limit', etc.
  message TEXT NOT NULL,
  metadata JSONB,                -- extra context (brand_id, gtin, stack trace, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_error_log_source ON error_log(source, created_at);

-- RLS: anyone can INSERT (so scan page can log errors), only service role reads
ALTER TABLE error_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert errors" ON error_log
  FOR INSERT WITH CHECK (true);

-- No SELECT policy for anon — only viewable via service role or dashboard
