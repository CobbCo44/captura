-- Allow per-location hours (null location_id = brand default)
ALTER TABLE store_hours ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES store_locations(id) ON DELETE CASCADE;

-- Drop old unique constraint and create new one including location_id
ALTER TABLE store_hours DROP CONSTRAINT IF EXISTS store_hours_brand_id_day_of_week_key;
CREATE UNIQUE INDEX IF NOT EXISTS store_hours_brand_location_day
  ON store_hours (brand_id, COALESCE(location_id, '00000000-0000-0000-0000-000000000000'), day_of_week);
