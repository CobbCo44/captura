-- Add latitude, longitude, region, and country columns to tables that only had city
-- This makes all consumer touchpoints mappable on the dashboard

ALTER TABLE promo_entries ADD COLUMN IF NOT EXISTS latitude REAL;
ALTER TABLE promo_entries ADD COLUMN IF NOT EXISTS longitude REAL;
ALTER TABLE promo_entries ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE promo_entries ADD COLUMN IF NOT EXISTS country TEXT;

ALTER TABLE event_entries ADD COLUMN IF NOT EXISTS latitude REAL;
ALTER TABLE event_entries ADD COLUMN IF NOT EXISTS longitude REAL;
ALTER TABLE event_entries ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE event_entries ADD COLUMN IF NOT EXISTS country TEXT;

ALTER TABLE warranty_registrations ADD COLUMN IF NOT EXISTS latitude REAL;
ALTER TABLE warranty_registrations ADD COLUMN IF NOT EXISTS longitude REAL;
ALTER TABLE warranty_registrations ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE warranty_registrations ADD COLUMN IF NOT EXISTS country TEXT;

-- Add region and country to vip_members (had lat/lng but was missing these)
ALTER TABLE vip_members ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE vip_members ADD COLUMN IF NOT EXISTS country TEXT;
