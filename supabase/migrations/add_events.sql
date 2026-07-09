-- Migration: Add Events system (separate from Promos)
-- Run this in Supabase SQL Editor

-- 1. Create events table
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  giveaway TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create event_entries table
CREATE TABLE IF NOT EXISTS event_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE NOT NULL,
  qr_code_id UUID REFERENCES qr_codes(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  city TEXT,
  entered_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Add event_id to qr_codes
ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE CASCADE;

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_events_brand ON events(brand_id);
CREATE INDEX IF NOT EXISTS idx_event_entries_event ON event_entries(event_id);
CREATE INDEX IF NOT EXISTS idx_event_entries_brand ON event_entries(brand_id);
CREATE INDEX IF NOT EXISTS idx_qr_event ON qr_codes(event_id);

-- 5. Row Level Security
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_entries ENABLE ROW LEVEL SECURITY;

-- Events: users can manage their own events
CREATE POLICY "Users manage own events" ON events
  FOR ALL USING (brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid()));

-- Event entries: users can view entries for their brand
CREATE POLICY "Users view own event_entries" ON event_entries
  FOR SELECT USING (brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid()));

-- Event entries: anyone can INSERT (public scan page)
CREATE POLICY "Anyone can submit event entry" ON event_entries
  FOR INSERT WITH CHECK (true);

-- Events: anyone can SELECT (needed for scan page)
CREATE POLICY "Anyone can read events" ON events
  FOR SELECT USING (true);
