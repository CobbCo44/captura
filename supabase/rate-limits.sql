-- ============================================================
-- Rate Limiting Table
-- Paste this into the Supabase SQL Editor and run.
-- ============================================================

-- Tracks form submissions by IP to prevent bot spam.
-- Rows older than 1 hour can be cleaned up periodically.
CREATE TABLE rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'unknown',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rate_limits_ip_time ON rate_limits(ip_address, created_at);

-- RLS: only service role can read/write (server-side function only)
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- No public policies — only the service role key (used by Netlify Functions) can access this table.
-- This means the anon key cannot read or write rate limit data.
