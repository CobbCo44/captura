-- ============================================================
-- Lock down consumer tables: remove public INSERT policies
-- Paste this into the Supabase SQL Editor and run.
--
-- After this, only the service role key (used by Netlify Functions)
-- can insert into these tables. The anon key (visible in the browser)
-- can no longer write directly. This prevents bots from bypassing
-- the rate limiter by posting straight to Supabase.
--
-- Existing SELECT policies remain so the scan page can still
-- read product/brand data, and dashboard users can view their data.
-- ============================================================

-- Remove public INSERT on vip_members
DROP POLICY IF EXISTS "Anyone can join vip" ON vip_members;

-- Remove public INSERT on promo_entries (if it exists)
DROP POLICY IF EXISTS "Anyone can enter promo" ON promo_entries;
DROP POLICY IF EXISTS "Anyone can create promo_entry" ON promo_entries;

-- Remove public INSERT on warranty_registrations (if it exists)
DROP POLICY IF EXISTS "Anyone can register warranty" ON warranty_registrations;
DROP POLICY IF EXISTS "Anyone can create warranty" ON warranty_registrations;

-- Remove public INSERT on event_entries (if it exists)
DROP POLICY IF EXISTS "Anyone can enter event" ON event_entries;
DROP POLICY IF EXISTS "Anyone can create event_entry" ON event_entries;

-- Scans still need public INSERT (logged from the browser before any form)
-- so we leave that policy in place.

-- Verify: after running this, test that scanning a QR code still works
-- (scan inserts use the anon key), but form submissions go through
-- the consumer-submit function (uses service role key).
