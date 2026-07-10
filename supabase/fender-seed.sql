-- Captura Seed Data for Fender Guitar Demo Brand
-- Brand email: apply@cobbcohunters.com
-- Dynamically looks up all IDs (brand, products, QR codes, promos, events)
-- Run this in Supabase SQL Editor

DO $$
DECLARE
  v_brand_id UUID;
  v_product_count INT := 0;
  v_promo_count INT := 0;
  v_event_count INT := 0;
  v_scan_count INT := 0;
  v_vip_count INT := 0;
  v_promo_entry_count INT := 0;
  v_event_entry_count INT := 0;

  -- Product/QR arrays (up to 10 products supported)
  v_prod_ids UUID[];
  v_qr_ids UUID[];

  -- Promo arrays
  v_promo_ids UUID[];

  -- Event arrays
  v_event_ids UUID[];

  -- Loop helpers
  v_idx INT;
  v_prod_idx INT;
  v_city_idx INT;
  v_device TEXT;
  v_interval INTERVAL;

  rec RECORD;
BEGIN
  -- ============================================================
  -- 1. Find brand_id
  -- ============================================================
  SELECT id INTO v_brand_id FROM brands WHERE email = 'apply@cobbcohunters.com' LIMIT 1;

  IF v_brand_id IS NULL THEN
    RAISE EXCEPTION 'Brand with email apply@cobbcohunters.com not found';
  END IF;

  RAISE NOTICE 'Found brand_id: %', v_brand_id;

  -- ============================================================
  -- 2. Collect all products and their QR codes for this brand
  -- ============================================================
  v_prod_ids := ARRAY[]::UUID[];
  v_qr_ids := ARRAY[]::UUID[];

  FOR rec IN
    SELECT p.id AS product_id, q.id AS qr_code_id
    FROM products p
    JOIN qr_codes q ON q.product_id = p.id AND q.brand_id = v_brand_id
    WHERE p.brand_id = v_brand_id
    ORDER BY p.created_at
  LOOP
    v_prod_ids := v_prod_ids || rec.product_id;
    v_qr_ids := v_qr_ids || rec.qr_code_id;
  END LOOP;

  v_product_count := array_length(v_prod_ids, 1);
  IF v_product_count IS NULL OR v_product_count = 0 THEN
    RAISE EXCEPTION 'No products with QR codes found for this brand';
  END IF;

  RAISE NOTICE 'Found % products with QR codes', v_product_count;

  -- ============================================================
  -- 3. Collect all promos for this brand
  -- ============================================================
  v_promo_ids := ARRAY[]::UUID[];

  FOR rec IN
    SELECT id FROM promos WHERE brand_id = v_brand_id ORDER BY created_at
  LOOP
    v_promo_ids := v_promo_ids || rec.id;
  END LOOP;

  v_promo_count := COALESCE(array_length(v_promo_ids, 1), 0);
  RAISE NOTICE 'Found % promos', v_promo_count;

  -- ============================================================
  -- 4. Collect all events for this brand
  -- ============================================================
  v_event_ids := ARRAY[]::UUID[];

  FOR rec IN
    SELECT id FROM events WHERE brand_id = v_brand_id ORDER BY created_at
  LOOP
    v_event_ids := v_event_ids || rec.id;
  END LOOP;

  v_event_count := COALESCE(array_length(v_event_ids, 1), 0);
  RAISE NOTICE 'Found % events', v_event_count;

  -- ============================================================
  -- SCANS (~150 total)
  -- Product 1 gets ~40 scans, rest distributed fairly
  -- 20 guitar-relevant cities, mix of iPhone/Android, last 30 days
  -- ============================================================

  -- Product 1: ~40 scans (the hero product)
  INSERT INTO scans (qr_code_id, product_id, brand_id, latitude, longitude, city, region, country, device, scanned_at) VALUES
  (v_qr_ids[1], v_prod_ids[1], v_brand_id, 34.05, -118.24, 'Los Angeles, CA', 'CA', 'US', 'iPhone', NOW() - INTERVAL '2 hours'),
  (v_qr_ids[1], v_prod_ids[1], v_brand_id, 34.05, -118.24, 'Los Angeles, CA', 'CA', 'US', 'Android', NOW() - INTERVAL '5 hours'),
  (v_qr_ids[1], v_prod_ids[1], v_brand_id, 36.16, -86.78, 'Nashville, TN', 'TN', 'US', 'iPhone', NOW() - INTERVAL '8 hours'),
  (v_qr_ids[1], v_prod_ids[1], v_brand_id, 36.16, -86.78, 'Nashville, TN', 'TN', 'US', 'iPhone', NOW() - INTERVAL '14 hours'),
  (v_qr_ids[1], v_prod_ids[1], v_brand_id, 30.27, -97.74, 'Austin, TX', 'TX', 'US', 'iPhone', NOW() - INTERVAL '1 day'),
  (v_qr_ids[1], v_prod_ids[1], v_brand_id, 30.27, -97.74, 'Austin, TX', 'TX', 'US', 'Android', NOW() - INTERVAL '1 day 4 hours'),
  (v_qr_ids[1], v_prod_ids[1], v_brand_id, 40.71, -74.01, 'New York, NY', 'NY', 'US', 'iPhone', NOW() - INTERVAL '1 day 10 hours'),
  (v_qr_ids[1], v_prod_ids[1], v_brand_id, 40.71, -74.01, 'New York, NY', 'NY', 'US', 'iPhone', NOW() - INTERVAL '2 days'),
  (v_qr_ids[1], v_prod_ids[1], v_brand_id, 41.88, -87.63, 'Chicago, IL', 'IL', 'US', 'Android', NOW() - INTERVAL '2 days 6 hours'),
  (v_qr_ids[1], v_prod_ids[1], v_brand_id, 41.88, -87.63, 'Chicago, IL', 'IL', 'US', 'iPhone', NOW() - INTERVAL '3 days'),
  (v_qr_ids[1], v_prod_ids[1], v_brand_id, 47.61, -122.33, 'Seattle, WA', 'WA', 'US', 'iPhone', NOW() - INTERVAL '3 days 8 hours'),
  (v_qr_ids[1], v_prod_ids[1], v_brand_id, 45.52, -122.68, 'Portland, OR', 'OR', 'US', 'iPhone', NOW() - INTERVAL '4 days'),
  (v_qr_ids[1], v_prod_ids[1], v_brand_id, 37.77, -122.42, 'San Francisco, CA', 'CA', 'US', 'Android', NOW() - INTERVAL '4 days 5 hours'),
  (v_qr_ids[1], v_prod_ids[1], v_brand_id, 37.77, -122.42, 'San Francisco, CA', 'CA', 'US', 'iPhone', NOW() - INTERVAL '5 days'),
  (v_qr_ids[1], v_prod_ids[1], v_brand_id, 39.74, -104.99, 'Denver, CO', 'CO', 'US', 'iPhone', NOW() - INTERVAL '5 days 7 hours'),
  (v_qr_ids[1], v_prod_ids[1], v_brand_id, 33.75, -84.39, 'Atlanta, GA', 'GA', 'US', 'iPhone', NOW() - INTERVAL '6 days'),
  (v_qr_ids[1], v_prod_ids[1], v_brand_id, 32.78, -96.80, 'Dallas, TX', 'TX', 'US', 'Android', NOW() - INTERVAL '7 days'),
  (v_qr_ids[1], v_prod_ids[1], v_brand_id, 29.76, -95.37, 'Houston, TX', 'TX', 'US', 'iPhone', NOW() - INTERVAL '7 days 12 hours'),
  (v_qr_ids[1], v_prod_ids[1], v_brand_id, 25.76, -80.19, 'Miami, FL', 'FL', 'US', 'iPhone', NOW() - INTERVAL '8 days'),
  (v_qr_ids[1], v_prod_ids[1], v_brand_id, 42.36, -71.06, 'Boston, MA', 'MA', 'US', 'Android', NOW() - INTERVAL '9 days'),
  (v_qr_ids[1], v_prod_ids[1], v_brand_id, 33.45, -112.07, 'Phoenix, AZ', 'AZ', 'US', 'iPhone', NOW() - INTERVAL '10 days'),
  (v_qr_ids[1], v_prod_ids[1], v_brand_id, 32.72, -117.16, 'San Diego, CA', 'CA', 'US', 'iPhone', NOW() - INTERVAL '11 days'),
  (v_qr_ids[1], v_prod_ids[1], v_brand_id, 44.98, -93.27, 'Minneapolis, MN', 'MN', 'US', 'iPhone', NOW() - INTERVAL '12 days'),
  (v_qr_ids[1], v_prod_ids[1], v_brand_id, 42.33, -83.05, 'Detroit, MI', 'MI', 'US', 'Android', NOW() - INTERVAL '13 days'),
  (v_qr_ids[1], v_prod_ids[1], v_brand_id, 39.95, -75.17, 'Philadelphia, PA', 'PA', 'US', 'iPhone', NOW() - INTERVAL '14 days'),
  (v_qr_ids[1], v_prod_ids[1], v_brand_id, 38.63, -90.20, 'St. Louis, MO', 'MO', 'US', 'iPhone', NOW() - INTERVAL '15 days'),
  (v_qr_ids[1], v_prod_ids[1], v_brand_id, 36.16, -86.78, 'Nashville, TN', 'TN', 'US', 'Android', NOW() - INTERVAL '16 days'),
  (v_qr_ids[1], v_prod_ids[1], v_brand_id, 34.05, -118.24, 'Los Angeles, CA', 'CA', 'US', 'iPhone', NOW() - INTERVAL '17 days'),
  (v_qr_ids[1], v_prod_ids[1], v_brand_id, 30.27, -97.74, 'Austin, TX', 'TX', 'US', 'iPhone', NOW() - INTERVAL '18 days'),
  (v_qr_ids[1], v_prod_ids[1], v_brand_id, 40.71, -74.01, 'New York, NY', 'NY', 'US', 'Android', NOW() - INTERVAL '19 days'),
  (v_qr_ids[1], v_prod_ids[1], v_brand_id, 47.61, -122.33, 'Seattle, WA', 'WA', 'US', 'iPhone', NOW() - INTERVAL '20 days'),
  (v_qr_ids[1], v_prod_ids[1], v_brand_id, 45.52, -122.68, 'Portland, OR', 'OR', 'US', 'iPhone', NOW() - INTERVAL '21 days'),
  (v_qr_ids[1], v_prod_ids[1], v_brand_id, 39.74, -104.99, 'Denver, CO', 'CO', 'US', 'Android', NOW() - INTERVAL '22 days'),
  (v_qr_ids[1], v_prod_ids[1], v_brand_id, 33.75, -84.39, 'Atlanta, GA', 'GA', 'US', 'iPhone', NOW() - INTERVAL '23 days'),
  (v_qr_ids[1], v_prod_ids[1], v_brand_id, 41.88, -87.63, 'Chicago, IL', 'IL', 'US', 'iPhone', NOW() - INTERVAL '24 days'),
  (v_qr_ids[1], v_prod_ids[1], v_brand_id, 25.76, -80.19, 'Miami, FL', 'FL', 'US', 'Android', NOW() - INTERVAL '25 days'),
  (v_qr_ids[1], v_prod_ids[1], v_brand_id, 37.77, -122.42, 'San Francisco, CA', 'CA', 'US', 'iPhone', NOW() - INTERVAL '26 days'),
  (v_qr_ids[1], v_prod_ids[1], v_brand_id, 29.76, -95.37, 'Houston, TX', 'TX', 'US', 'iPhone', NOW() - INTERVAL '27 days'),
  (v_qr_ids[1], v_prod_ids[1], v_brand_id, 32.78, -96.80, 'Dallas, TX', 'TX', 'US', 'iPhone', NOW() - INTERVAL '28 days'),
  (v_qr_ids[1], v_prod_ids[1], v_brand_id, 42.36, -71.06, 'Boston, MA', 'MA', 'US', 'iPhone', NOW() - INTERVAL '29 days');
  v_scan_count := v_scan_count + 40;

  -- Product 2: ~28 scans (if exists)
  IF v_product_count >= 2 THEN
    INSERT INTO scans (qr_code_id, product_id, brand_id, latitude, longitude, city, region, country, device, scanned_at) VALUES
    (v_qr_ids[2], v_prod_ids[2], v_brand_id, 36.16, -86.78, 'Nashville, TN', 'TN', 'US', 'iPhone', NOW() - INTERVAL '3 hours'),
    (v_qr_ids[2], v_prod_ids[2], v_brand_id, 30.27, -97.74, 'Austin, TX', 'TX', 'US', 'Android', NOW() - INTERVAL '10 hours'),
    (v_qr_ids[2], v_prod_ids[2], v_brand_id, 34.05, -118.24, 'Los Angeles, CA', 'CA', 'US', 'iPhone', NOW() - INTERVAL '1 day 2 hours'),
    (v_qr_ids[2], v_prod_ids[2], v_brand_id, 40.71, -74.01, 'New York, NY', 'NY', 'US', 'iPhone', NOW() - INTERVAL '2 days 3 hours'),
    (v_qr_ids[2], v_prod_ids[2], v_brand_id, 41.88, -87.63, 'Chicago, IL', 'IL', 'US', 'Android', NOW() - INTERVAL '3 days 5 hours'),
    (v_qr_ids[2], v_prod_ids[2], v_brand_id, 47.61, -122.33, 'Seattle, WA', 'WA', 'US', 'iPhone', NOW() - INTERVAL '4 days'),
    (v_qr_ids[2], v_prod_ids[2], v_brand_id, 45.52, -122.68, 'Portland, OR', 'OR', 'US', 'iPhone', NOW() - INTERVAL '5 days 8 hours'),
    (v_qr_ids[2], v_prod_ids[2], v_brand_id, 37.77, -122.42, 'San Francisco, CA', 'CA', 'US', 'iPhone', NOW() - INTERVAL '6 days'),
    (v_qr_ids[2], v_prod_ids[2], v_brand_id, 39.74, -104.99, 'Denver, CO', 'CO', 'US', 'Android', NOW() - INTERVAL '7 days 4 hours'),
    (v_qr_ids[2], v_prod_ids[2], v_brand_id, 33.75, -84.39, 'Atlanta, GA', 'GA', 'US', 'iPhone', NOW() - INTERVAL '8 days'),
    (v_qr_ids[2], v_prod_ids[2], v_brand_id, 32.78, -96.80, 'Dallas, TX', 'TX', 'US', 'iPhone', NOW() - INTERVAL '9 days 6 hours'),
    (v_qr_ids[2], v_prod_ids[2], v_brand_id, 29.76, -95.37, 'Houston, TX', 'TX', 'US', 'Android', NOW() - INTERVAL '10 days'),
    (v_qr_ids[2], v_prod_ids[2], v_brand_id, 25.76, -80.19, 'Miami, FL', 'FL', 'US', 'iPhone', NOW() - INTERVAL '11 days 3 hours'),
    (v_qr_ids[2], v_prod_ids[2], v_brand_id, 42.36, -71.06, 'Boston, MA', 'MA', 'US', 'iPhone', NOW() - INTERVAL '12 days'),
    (v_qr_ids[2], v_prod_ids[2], v_brand_id, 33.45, -112.07, 'Phoenix, AZ', 'AZ', 'US', 'iPhone', NOW() - INTERVAL '13 days 7 hours'),
    (v_qr_ids[2], v_prod_ids[2], v_brand_id, 32.72, -117.16, 'San Diego, CA', 'CA', 'US', 'Android', NOW() - INTERVAL '15 days'),
    (v_qr_ids[2], v_prod_ids[2], v_brand_id, 44.98, -93.27, 'Minneapolis, MN', 'MN', 'US', 'iPhone', NOW() - INTERVAL '17 days'),
    (v_qr_ids[2], v_prod_ids[2], v_brand_id, 42.33, -83.05, 'Detroit, MI', 'MI', 'US', 'iPhone', NOW() - INTERVAL '18 days'),
    (v_qr_ids[2], v_prod_ids[2], v_brand_id, 39.95, -75.17, 'Philadelphia, PA', 'PA', 'US', 'Android', NOW() - INTERVAL '20 days'),
    (v_qr_ids[2], v_prod_ids[2], v_brand_id, 38.63, -90.20, 'St. Louis, MO', 'MO', 'US', 'iPhone', NOW() - INTERVAL '21 days'),
    (v_qr_ids[2], v_prod_ids[2], v_brand_id, 36.16, -86.78, 'Nashville, TN', 'TN', 'US', 'iPhone', NOW() - INTERVAL '22 days'),
    (v_qr_ids[2], v_prod_ids[2], v_brand_id, 34.05, -118.24, 'Los Angeles, CA', 'CA', 'US', 'Android', NOW() - INTERVAL '24 days'),
    (v_qr_ids[2], v_prod_ids[2], v_brand_id, 30.27, -97.74, 'Austin, TX', 'TX', 'US', 'iPhone', NOW() - INTERVAL '25 days'),
    (v_qr_ids[2], v_prod_ids[2], v_brand_id, 40.71, -74.01, 'New York, NY', 'NY', 'US', 'iPhone', NOW() - INTERVAL '26 days'),
    (v_qr_ids[2], v_prod_ids[2], v_brand_id, 41.88, -87.63, 'Chicago, IL', 'IL', 'US', 'iPhone', NOW() - INTERVAL '27 days'),
    (v_qr_ids[2], v_prod_ids[2], v_brand_id, 47.61, -122.33, 'Seattle, WA', 'WA', 'US', 'Android', NOW() - INTERVAL '28 days'),
    (v_qr_ids[2], v_prod_ids[2], v_brand_id, 33.75, -84.39, 'Atlanta, GA', 'GA', 'US', 'iPhone', NOW() - INTERVAL '29 days'),
    (v_qr_ids[2], v_prod_ids[2], v_brand_id, 25.76, -80.19, 'Miami, FL', 'FL', 'US', 'iPhone', NOW() - INTERVAL '30 days');
    v_scan_count := v_scan_count + 28;
  END IF;

  -- Product 3: ~25 scans (if exists)
  IF v_product_count >= 3 THEN
    INSERT INTO scans (qr_code_id, product_id, brand_id, latitude, longitude, city, region, country, device, scanned_at) VALUES
    (v_qr_ids[3], v_prod_ids[3], v_brand_id, 34.05, -118.24, 'Los Angeles, CA', 'CA', 'US', 'iPhone', NOW() - INTERVAL '6 hours'),
    (v_qr_ids[3], v_prod_ids[3], v_brand_id, 36.16, -86.78, 'Nashville, TN', 'TN', 'US', 'Android', NOW() - INTERVAL '1 day'),
    (v_qr_ids[3], v_prod_ids[3], v_brand_id, 30.27, -97.74, 'Austin, TX', 'TX', 'US', 'iPhone', NOW() - INTERVAL '2 days 5 hours'),
    (v_qr_ids[3], v_prod_ids[3], v_brand_id, 40.71, -74.01, 'New York, NY', 'NY', 'US', 'iPhone', NOW() - INTERVAL '3 days'),
    (v_qr_ids[3], v_prod_ids[3], v_brand_id, 47.61, -122.33, 'Seattle, WA', 'WA', 'US', 'Android', NOW() - INTERVAL '4 days 8 hours'),
    (v_qr_ids[3], v_prod_ids[3], v_brand_id, 39.74, -104.99, 'Denver, CO', 'CO', 'US', 'iPhone', NOW() - INTERVAL '5 days'),
    (v_qr_ids[3], v_prod_ids[3], v_brand_id, 33.75, -84.39, 'Atlanta, GA', 'GA', 'US', 'iPhone', NOW() - INTERVAL '6 days 3 hours'),
    (v_qr_ids[3], v_prod_ids[3], v_brand_id, 32.78, -96.80, 'Dallas, TX', 'TX', 'US', 'iPhone', NOW() - INTERVAL '7 days'),
    (v_qr_ids[3], v_prod_ids[3], v_brand_id, 29.76, -95.37, 'Houston, TX', 'TX', 'US', 'Android', NOW() - INTERVAL '8 days 6 hours'),
    (v_qr_ids[3], v_prod_ids[3], v_brand_id, 25.76, -80.19, 'Miami, FL', 'FL', 'US', 'iPhone', NOW() - INTERVAL '10 days'),
    (v_qr_ids[3], v_prod_ids[3], v_brand_id, 42.36, -71.06, 'Boston, MA', 'MA', 'US', 'iPhone', NOW() - INTERVAL '11 days'),
    (v_qr_ids[3], v_prod_ids[3], v_brand_id, 33.45, -112.07, 'Phoenix, AZ', 'AZ', 'US', 'Android', NOW() - INTERVAL '12 days 4 hours'),
    (v_qr_ids[3], v_prod_ids[3], v_brand_id, 32.72, -117.16, 'San Diego, CA', 'CA', 'US', 'iPhone', NOW() - INTERVAL '14 days'),
    (v_qr_ids[3], v_prod_ids[3], v_brand_id, 44.98, -93.27, 'Minneapolis, MN', 'MN', 'US', 'iPhone', NOW() - INTERVAL '15 days'),
    (v_qr_ids[3], v_prod_ids[3], v_brand_id, 42.33, -83.05, 'Detroit, MI', 'MI', 'US', 'iPhone', NOW() - INTERVAL '17 days'),
    (v_qr_ids[3], v_prod_ids[3], v_brand_id, 39.95, -75.17, 'Philadelphia, PA', 'PA', 'US', 'Android', NOW() - INTERVAL '18 days'),
    (v_qr_ids[3], v_prod_ids[3], v_brand_id, 38.63, -90.20, 'St. Louis, MO', 'MO', 'US', 'iPhone', NOW() - INTERVAL '19 days'),
    (v_qr_ids[3], v_prod_ids[3], v_brand_id, 41.88, -87.63, 'Chicago, IL', 'IL', 'US', 'iPhone', NOW() - INTERVAL '20 days 5 hours'),
    (v_qr_ids[3], v_prod_ids[3], v_brand_id, 36.16, -86.78, 'Nashville, TN', 'TN', 'US', 'Android', NOW() - INTERVAL '22 days'),
    (v_qr_ids[3], v_prod_ids[3], v_brand_id, 34.05, -118.24, 'Los Angeles, CA', 'CA', 'US', 'iPhone', NOW() - INTERVAL '23 days'),
    (v_qr_ids[3], v_prod_ids[3], v_brand_id, 45.52, -122.68, 'Portland, OR', 'OR', 'US', 'iPhone', NOW() - INTERVAL '24 days'),
    (v_qr_ids[3], v_prod_ids[3], v_brand_id, 30.27, -97.74, 'Austin, TX', 'TX', 'US', 'Android', NOW() - INTERVAL '26 days'),
    (v_qr_ids[3], v_prod_ids[3], v_brand_id, 40.71, -74.01, 'New York, NY', 'NY', 'US', 'iPhone', NOW() - INTERVAL '27 days'),
    (v_qr_ids[3], v_prod_ids[3], v_brand_id, 37.77, -122.42, 'San Francisco, CA', 'CA', 'US', 'iPhone', NOW() - INTERVAL '28 days'),
    (v_qr_ids[3], v_prod_ids[3], v_brand_id, 29.76, -95.37, 'Houston, TX', 'TX', 'US', 'iPhone', NOW() - INTERVAL '30 days');
    v_scan_count := v_scan_count + 25;
  END IF;

  -- Product 4: ~22 scans (if exists)
  IF v_product_count >= 4 THEN
    INSERT INTO scans (qr_code_id, product_id, brand_id, latitude, longitude, city, region, country, device, scanned_at) VALUES
    (v_qr_ids[4], v_prod_ids[4], v_brand_id, 36.16, -86.78, 'Nashville, TN', 'TN', 'US', 'iPhone', NOW() - INTERVAL '4 hours'),
    (v_qr_ids[4], v_prod_ids[4], v_brand_id, 34.05, -118.24, 'Los Angeles, CA', 'CA', 'US', 'Android', NOW() - INTERVAL '1 day 6 hours'),
    (v_qr_ids[4], v_prod_ids[4], v_brand_id, 30.27, -97.74, 'Austin, TX', 'TX', 'US', 'iPhone', NOW() - INTERVAL '2 days 8 hours'),
    (v_qr_ids[4], v_prod_ids[4], v_brand_id, 40.71, -74.01, 'New York, NY', 'NY', 'US', 'iPhone', NOW() - INTERVAL '3 days 4 hours'),
    (v_qr_ids[4], v_prod_ids[4], v_brand_id, 41.88, -87.63, 'Chicago, IL', 'IL', 'US', 'iPhone', NOW() - INTERVAL '4 days 10 hours'),
    (v_qr_ids[4], v_prod_ids[4], v_brand_id, 47.61, -122.33, 'Seattle, WA', 'WA', 'US', 'Android', NOW() - INTERVAL '6 days'),
    (v_qr_ids[4], v_prod_ids[4], v_brand_id, 37.77, -122.42, 'San Francisco, CA', 'CA', 'US', 'iPhone', NOW() - INTERVAL '7 days 5 hours'),
    (v_qr_ids[4], v_prod_ids[4], v_brand_id, 39.74, -104.99, 'Denver, CO', 'CO', 'US', 'iPhone', NOW() - INTERVAL '9 days'),
    (v_qr_ids[4], v_prod_ids[4], v_brand_id, 33.75, -84.39, 'Atlanta, GA', 'GA', 'US', 'Android', NOW() - INTERVAL '10 days 8 hours'),
    (v_qr_ids[4], v_prod_ids[4], v_brand_id, 25.76, -80.19, 'Miami, FL', 'FL', 'US', 'iPhone', NOW() - INTERVAL '12 days'),
    (v_qr_ids[4], v_prod_ids[4], v_brand_id, 42.36, -71.06, 'Boston, MA', 'MA', 'US', 'iPhone', NOW() - INTERVAL '13 days 3 hours'),
    (v_qr_ids[4], v_prod_ids[4], v_brand_id, 33.45, -112.07, 'Phoenix, AZ', 'AZ', 'US', 'Android', NOW() - INTERVAL '15 days'),
    (v_qr_ids[4], v_prod_ids[4], v_brand_id, 32.72, -117.16, 'San Diego, CA', 'CA', 'US', 'iPhone', NOW() - INTERVAL '16 days 6 hours'),
    (v_qr_ids[4], v_prod_ids[4], v_brand_id, 44.98, -93.27, 'Minneapolis, MN', 'MN', 'US', 'iPhone', NOW() - INTERVAL '18 days'),
    (v_qr_ids[4], v_prod_ids[4], v_brand_id, 42.33, -83.05, 'Detroit, MI', 'MI', 'US', 'Android', NOW() - INTERVAL '19 days 4 hours'),
    (v_qr_ids[4], v_prod_ids[4], v_brand_id, 39.95, -75.17, 'Philadelphia, PA', 'PA', 'US', 'iPhone', NOW() - INTERVAL '21 days'),
    (v_qr_ids[4], v_prod_ids[4], v_brand_id, 38.63, -90.20, 'St. Louis, MO', 'MO', 'US', 'iPhone', NOW() - INTERVAL '22 days 7 hours'),
    (v_qr_ids[4], v_prod_ids[4], v_brand_id, 45.52, -122.68, 'Portland, OR', 'OR', 'US', 'Android', NOW() - INTERVAL '24 days'),
    (v_qr_ids[4], v_prod_ids[4], v_brand_id, 32.78, -96.80, 'Dallas, TX', 'TX', 'US', 'iPhone', NOW() - INTERVAL '25 days 5 hours'),
    (v_qr_ids[4], v_prod_ids[4], v_brand_id, 29.76, -95.37, 'Houston, TX', 'TX', 'US', 'iPhone', NOW() - INTERVAL '27 days'),
    (v_qr_ids[4], v_prod_ids[4], v_brand_id, 36.16, -86.78, 'Nashville, TN', 'TN', 'US', 'iPhone', NOW() - INTERVAL '28 days 8 hours'),
    (v_qr_ids[4], v_prod_ids[4], v_brand_id, 34.05, -118.24, 'Los Angeles, CA', 'CA', 'US', 'Android', NOW() - INTERVAL '30 days');
    v_scan_count := v_scan_count + 22;
  END IF;

  -- Product 5: ~20 scans (if exists)
  IF v_product_count >= 5 THEN
    INSERT INTO scans (qr_code_id, product_id, brand_id, latitude, longitude, city, region, country, device, scanned_at) VALUES
    (v_qr_ids[5], v_prod_ids[5], v_brand_id, 34.05, -118.24, 'Los Angeles, CA', 'CA', 'US', 'iPhone', NOW() - INTERVAL '7 hours'),
    (v_qr_ids[5], v_prod_ids[5], v_brand_id, 36.16, -86.78, 'Nashville, TN', 'TN', 'US', 'Android', NOW() - INTERVAL '1 day 3 hours'),
    (v_qr_ids[5], v_prod_ids[5], v_brand_id, 30.27, -97.74, 'Austin, TX', 'TX', 'US', 'iPhone', NOW() - INTERVAL '2 days 9 hours'),
    (v_qr_ids[5], v_prod_ids[5], v_brand_id, 40.71, -74.01, 'New York, NY', 'NY', 'US', 'iPhone', NOW() - INTERVAL '4 days'),
    (v_qr_ids[5], v_prod_ids[5], v_brand_id, 41.88, -87.63, 'Chicago, IL', 'IL', 'US', 'iPhone', NOW() - INTERVAL '5 days 6 hours'),
    (v_qr_ids[5], v_prod_ids[5], v_brand_id, 47.61, -122.33, 'Seattle, WA', 'WA', 'US', 'Android', NOW() - INTERVAL '7 days'),
    (v_qr_ids[5], v_prod_ids[5], v_brand_id, 37.77, -122.42, 'San Francisco, CA', 'CA', 'US', 'iPhone', NOW() - INTERVAL '9 days'),
    (v_qr_ids[5], v_prod_ids[5], v_brand_id, 39.74, -104.99, 'Denver, CO', 'CO', 'US', 'iPhone', NOW() - INTERVAL '10 days 5 hours'),
    (v_qr_ids[5], v_prod_ids[5], v_brand_id, 33.75, -84.39, 'Atlanta, GA', 'GA', 'US', 'Android', NOW() - INTERVAL '12 days'),
    (v_qr_ids[5], v_prod_ids[5], v_brand_id, 25.76, -80.19, 'Miami, FL', 'FL', 'US', 'iPhone', NOW() - INTERVAL '14 days'),
    (v_qr_ids[5], v_prod_ids[5], v_brand_id, 42.36, -71.06, 'Boston, MA', 'MA', 'US', 'iPhone', NOW() - INTERVAL '15 days 8 hours'),
    (v_qr_ids[5], v_prod_ids[5], v_brand_id, 33.45, -112.07, 'Phoenix, AZ', 'AZ', 'US', 'iPhone', NOW() - INTERVAL '17 days'),
    (v_qr_ids[5], v_prod_ids[5], v_brand_id, 32.72, -117.16, 'San Diego, CA', 'CA', 'US', 'Android', NOW() - INTERVAL '19 days'),
    (v_qr_ids[5], v_prod_ids[5], v_brand_id, 44.98, -93.27, 'Minneapolis, MN', 'MN', 'US', 'iPhone', NOW() - INTERVAL '21 days'),
    (v_qr_ids[5], v_prod_ids[5], v_brand_id, 42.33, -83.05, 'Detroit, MI', 'MI', 'US', 'iPhone', NOW() - INTERVAL '22 days 4 hours'),
    (v_qr_ids[5], v_prod_ids[5], v_brand_id, 39.95, -75.17, 'Philadelphia, PA', 'PA', 'US', 'Android', NOW() - INTERVAL '24 days'),
    (v_qr_ids[5], v_prod_ids[5], v_brand_id, 38.63, -90.20, 'St. Louis, MO', 'MO', 'US', 'iPhone', NOW() - INTERVAL '25 days 6 hours'),
    (v_qr_ids[5], v_prod_ids[5], v_brand_id, 45.52, -122.68, 'Portland, OR', 'OR', 'US', 'iPhone', NOW() - INTERVAL '27 days'),
    (v_qr_ids[5], v_prod_ids[5], v_brand_id, 32.78, -96.80, 'Dallas, TX', 'TX', 'US', 'Android', NOW() - INTERVAL '28 days 3 hours'),
    (v_qr_ids[5], v_prod_ids[5], v_brand_id, 29.76, -95.37, 'Houston, TX', 'TX', 'US', 'iPhone', NOW() - INTERVAL '30 days');
    v_scan_count := v_scan_count + 20;
  END IF;

  -- Remaining products (6+): ~15 scans each
  IF v_product_count >= 6 THEN
    FOR v_idx IN 6..v_product_count LOOP
      INSERT INTO scans (qr_code_id, product_id, brand_id, latitude, longitude, city, region, country, device, scanned_at) VALUES
      (v_qr_ids[v_idx], v_prod_ids[v_idx], v_brand_id, 34.05, -118.24, 'Los Angeles, CA', 'CA', 'US', 'iPhone', NOW() - INTERVAL '1 day'),
      (v_qr_ids[v_idx], v_prod_ids[v_idx], v_brand_id, 36.16, -86.78, 'Nashville, TN', 'TN', 'US', 'Android', NOW() - INTERVAL '3 days'),
      (v_qr_ids[v_idx], v_prod_ids[v_idx], v_brand_id, 30.27, -97.74, 'Austin, TX', 'TX', 'US', 'iPhone', NOW() - INTERVAL '5 days'),
      (v_qr_ids[v_idx], v_prod_ids[v_idx], v_brand_id, 40.71, -74.01, 'New York, NY', 'NY', 'US', 'iPhone', NOW() - INTERVAL '7 days'),
      (v_qr_ids[v_idx], v_prod_ids[v_idx], v_brand_id, 41.88, -87.63, 'Chicago, IL', 'IL', 'US', 'Android', NOW() - INTERVAL '9 days'),
      (v_qr_ids[v_idx], v_prod_ids[v_idx], v_brand_id, 47.61, -122.33, 'Seattle, WA', 'WA', 'US', 'iPhone', NOW() - INTERVAL '11 days'),
      (v_qr_ids[v_idx], v_prod_ids[v_idx], v_brand_id, 37.77, -122.42, 'San Francisco, CA', 'CA', 'US', 'iPhone', NOW() - INTERVAL '13 days'),
      (v_qr_ids[v_idx], v_prod_ids[v_idx], v_brand_id, 39.74, -104.99, 'Denver, CO', 'CO', 'US', 'iPhone', NOW() - INTERVAL '15 days'),
      (v_qr_ids[v_idx], v_prod_ids[v_idx], v_brand_id, 33.75, -84.39, 'Atlanta, GA', 'GA', 'US', 'Android', NOW() - INTERVAL '17 days'),
      (v_qr_ids[v_idx], v_prod_ids[v_idx], v_brand_id, 25.76, -80.19, 'Miami, FL', 'FL', 'US', 'iPhone', NOW() - INTERVAL '19 days'),
      (v_qr_ids[v_idx], v_prod_ids[v_idx], v_brand_id, 32.78, -96.80, 'Dallas, TX', 'TX', 'US', 'iPhone', NOW() - INTERVAL '21 days'),
      (v_qr_ids[v_idx], v_prod_ids[v_idx], v_brand_id, 29.76, -95.37, 'Houston, TX', 'TX', 'US', 'Android', NOW() - INTERVAL '23 days'),
      (v_qr_ids[v_idx], v_prod_ids[v_idx], v_brand_id, 42.36, -71.06, 'Boston, MA', 'MA', 'US', 'iPhone', NOW() - INTERVAL '25 days'),
      (v_qr_ids[v_idx], v_prod_ids[v_idx], v_brand_id, 33.45, -112.07, 'Phoenix, AZ', 'AZ', 'US', 'iPhone', NOW() - INTERVAL '27 days'),
      (v_qr_ids[v_idx], v_prod_ids[v_idx], v_brand_id, 45.52, -122.68, 'Portland, OR', 'OR', 'US', 'iPhone', NOW() - INTERVAL '29 days');
      v_scan_count := v_scan_count + 15;
    END LOOP;
  END IF;

  RAISE NOTICE 'Inserted % scans', v_scan_count;

  -- ============================================================
  -- VIP MEMBERS (30 guitar-player names, mixed male/female)
  -- Spread across products and cities, last 30 days
  -- ============================================================

  -- Members linked to product 1 (8 members)
  INSERT INTO vip_members (brand_id, product_id, qr_code_id, first_name, last_name, email, phone, city, joined_at) VALUES
  (v_brand_id, v_prod_ids[1], v_qr_ids[1], 'Johnny', 'Raines', 'johnny.raines@gmail.com', '(310) 555-0701', 'Los Angeles, CA', NOW() - INTERVAL '1 day'),
  (v_brand_id, v_prod_ids[1], v_qr_ids[1], 'Stevie', 'Vaughan', 'stevie.v@outlook.com', '(512) 555-0702', 'Austin, TX', NOW() - INTERVAL '3 days'),
  (v_brand_id, v_prod_ids[1], v_qr_ids[1], 'Clara', 'Hendrix', 'clara.hendrix@yahoo.com', '(615) 555-0703', 'Nashville, TN', NOW() - INTERVAL '5 days'),
  (v_brand_id, v_prod_ids[1], v_qr_ids[1], 'Ray', 'Stratton', 'ray.stratton@gmail.com', '(212) 555-0704', 'New York, NY', NOW() - INTERVAL '7 days'),
  (v_brand_id, v_prod_ids[1], v_qr_ids[1], 'Bonnie', 'Fretwell', 'bonnie.f@icloud.com', '(312) 555-0705', 'Chicago, IL', NOW() - INTERVAL '10 days'),
  (v_brand_id, v_prod_ids[1], v_qr_ids[1], 'Duane', 'Bridges', 'duane.bridges@gmail.com', '(206) 555-0706', 'Seattle, WA', NOW() - INTERVAL '14 days'),
  (v_brand_id, v_prod_ids[1], v_qr_ids[1], 'Rosie', 'Chord', 'rosie.chord@outlook.com', '(503) 555-0707', 'Portland, OR', NOW() - INTERVAL '18 days'),
  (v_brand_id, v_prod_ids[1], v_qr_ids[1], 'Eddie', 'Tremolo', 'eddie.t@yahoo.com', '(415) 555-0708', 'San Francisco, CA', NOW() - INTERVAL '22 days');
  v_vip_count := v_vip_count + 8;

  -- Members linked to product 2 (6 members, if exists)
  IF v_product_count >= 2 THEN
    INSERT INTO vip_members (brand_id, product_id, qr_code_id, first_name, last_name, email, phone, city, joined_at) VALUES
    (v_brand_id, v_prod_ids[2], v_qr_ids[2], 'Jimi', 'Pickens', 'jimi.pickens@gmail.com', '(303) 555-0711', 'Denver, CO', NOW() - INTERVAL '2 days'),
    (v_brand_id, v_prod_ids[2], v_qr_ids[2], 'Angela', 'Tuner', 'angela.tuner@icloud.com', '(404) 555-0712', 'Atlanta, GA', NOW() - INTERVAL '5 days'),
    (v_brand_id, v_prod_ids[2], v_qr_ids[2], 'Slash', 'Rodgers', 'slash.r@outlook.com', '(214) 555-0713', 'Dallas, TX', NOW() - INTERVAL '9 days'),
    (v_brand_id, v_prod_ids[2], v_qr_ids[2], 'Tina', 'Capo', 'tina.capo@gmail.com', '(713) 555-0714', 'Houston, TX', NOW() - INTERVAL '13 days'),
    (v_brand_id, v_prod_ids[2], v_qr_ids[2], 'Kurt', 'Fender', 'kurt.fender@yahoo.com', '(305) 555-0715', 'Miami, FL', NOW() - INTERVAL '19 days'),
    (v_brand_id, v_prod_ids[2], v_qr_ids[2], 'Lila', 'Strum', 'lila.strum@gmail.com', '(617) 555-0716', 'Boston, MA', NOW() - INTERVAL '24 days');
    v_vip_count := v_vip_count + 6;
  END IF;

  -- Members linked to product 3 (5 members, if exists)
  IF v_product_count >= 3 THEN
    INSERT INTO vip_members (brand_id, product_id, qr_code_id, first_name, last_name, email, phone, city, joined_at) VALUES
    (v_brand_id, v_prod_ids[3], v_qr_ids[3], 'Carlos', 'Santana', 'carlos.s@outlook.com', '(602) 555-0721', 'Phoenix, AZ', NOW() - INTERVAL '2 days'),
    (v_brand_id, v_prod_ids[3], v_qr_ids[3], 'Nina', 'Riffton', 'nina.riff@gmail.com', '(619) 555-0722', 'San Diego, CA', NOW() - INTERVAL '6 days'),
    (v_brand_id, v_prod_ids[3], v_qr_ids[3], 'Hank', 'Amplifier', 'hank.amp@icloud.com', '(612) 555-0723', 'Minneapolis, MN', NOW() - INTERVAL '12 days'),
    (v_brand_id, v_prod_ids[3], v_qr_ids[3], 'Sadie', 'Whammy', 'sadie.w@yahoo.com', '(313) 555-0724', 'Detroit, MI', NOW() - INTERVAL '17 days'),
    (v_brand_id, v_prod_ids[3], v_qr_ids[3], 'Pete', 'Townshend', 'pete.t@gmail.com', '(215) 555-0725', 'Philadelphia, PA', NOW() - INTERVAL '23 days');
    v_vip_count := v_vip_count + 5;
  END IF;

  -- Members linked to product 4 (6 members, if exists)
  IF v_product_count >= 4 THEN
    INSERT INTO vip_members (brand_id, product_id, qr_code_id, first_name, last_name, email, phone, city, joined_at) VALUES
    (v_brand_id, v_prod_ids[4], v_qr_ids[4], 'Jesse', 'Reverb', 'jesse.reverb@gmail.com', '(314) 555-0731', 'St. Louis, MO', NOW() - INTERVAL '1 day'),
    (v_brand_id, v_prod_ids[4], v_qr_ids[4], 'Daisy', 'Slide', 'daisy.slide@outlook.com', '(615) 555-0732', 'Nashville, TN', NOW() - INTERVAL '4 days'),
    (v_brand_id, v_prod_ids[4], v_qr_ids[4], 'Mick', 'Gibson', 'mick.gibson@yahoo.com', '(310) 555-0733', 'Los Angeles, CA', NOW() - INTERVAL '8 days'),
    (v_brand_id, v_prod_ids[4], v_qr_ids[4], 'Phoebe', 'Marshall', 'phoebe.m@icloud.com', '(512) 555-0734', 'Austin, TX', NOW() - INTERVAL '15 days'),
    (v_brand_id, v_prod_ids[4], v_qr_ids[4], 'Tony', 'Ibanez', 'tony.ibanez@gmail.com', '(212) 555-0735', 'New York, NY', NOW() - INTERVAL '20 days'),
    (v_brand_id, v_prod_ids[4], v_qr_ids[4], 'Wren', 'Pedal', 'wren.pedal@outlook.com', '(312) 555-0736', 'Chicago, IL', NOW() - INTERVAL '26 days');
    v_vip_count := v_vip_count + 6;
  END IF;

  -- Members linked to product 5 (5 members, if exists)
  IF v_product_count >= 5 THEN
    INSERT INTO vip_members (brand_id, product_id, qr_code_id, first_name, last_name, email, phone, city, joined_at) VALUES
    (v_brand_id, v_prod_ids[5], v_qr_ids[5], 'Angus', 'Pickup', 'angus.pickup@gmail.com', '(206) 555-0741', 'Seattle, WA', NOW() - INTERVAL '2 days'),
    (v_brand_id, v_prod_ids[5], v_qr_ids[5], 'Ivy', 'Distortion', 'ivy.dist@icloud.com', '(503) 555-0742', 'Portland, OR', NOW() - INTERVAL '8 days'),
    (v_brand_id, v_prod_ids[5], v_qr_ids[5], 'Leo', 'Neck', 'leo.neck@outlook.com', '(415) 555-0743', 'San Francisco, CA', NOW() - INTERVAL '14 days'),
    (v_brand_id, v_prod_ids[5], v_qr_ids[5], 'Ruby', 'String', 'ruby.string@yahoo.com', '(303) 555-0744', 'Denver, CO', NOW() - INTERVAL '21 days'),
    (v_brand_id, v_prod_ids[5], v_qr_ids[5], 'Buck', 'Owens', 'buck.owens@gmail.com', '(404) 555-0745', 'Atlanta, GA', NOW() - INTERVAL '28 days');
    v_vip_count := v_vip_count + 5;
  END IF;

  RAISE NOTICE 'Inserted % VIP members', v_vip_count;

  -- ============================================================
  -- PROMO ENTRIES (~20 total, spread across all promos)
  -- Different names from VIP members, last 21 days
  -- ============================================================

  IF v_promo_count >= 1 THEN
    -- First promo gets ~12 entries (or all 20 if only 1 promo)
    INSERT INTO promo_entries (promo_id, brand_id, qr_code_id, product_id, first_name, last_name, email, phone, city, entered_at) VALUES
    (v_promo_ids[1], v_brand_id, v_qr_ids[1], v_prod_ids[1], 'Ricky', 'Axelrod', 'ricky.axel@gmail.com', '(310) 555-0801', 'Los Angeles, CA', NOW() - INTERVAL '1 day'),
    (v_promo_ids[1], v_brand_id, v_qr_ids[1], v_prod_ids[1], 'Tamara', 'Bassline', 'tamara.b@outlook.com', '(615) 555-0802', 'Nashville, TN', NOW() - INTERVAL '2 days'),
    (v_promo_ids[1], v_brand_id, v_qr_ids[LEAST(2, v_product_count)], v_prod_ids[LEAST(2, v_product_count)], 'Vince', 'Octave', 'vince.oct@yahoo.com', '(512) 555-0803', 'Austin, TX', NOW() - INTERVAL '3 days'),
    (v_promo_ids[1], v_brand_id, v_qr_ids[LEAST(2, v_product_count)], v_prod_ids[LEAST(2, v_product_count)], 'Gwen', 'Rhodes', 'gwen.rhodes@gmail.com', '(212) 555-0804', 'New York, NY', NOW() - INTERVAL '5 days'),
    (v_promo_ids[1], v_brand_id, v_qr_ids[LEAST(3, v_product_count)], v_prod_ids[LEAST(3, v_product_count)], 'Dante', 'Wah', 'dante.wah@icloud.com', '(312) 555-0805', 'Chicago, IL', NOW() - INTERVAL '7 days'),
    (v_promo_ids[1], v_brand_id, v_qr_ids[LEAST(3, v_product_count)], v_prod_ids[LEAST(3, v_product_count)], 'Marley', 'Fuzz', 'marley.fuzz@gmail.com', '(206) 555-0806', 'Seattle, WA', NOW() - INTERVAL '9 days'),
    (v_promo_ids[1], v_brand_id, v_qr_ids[LEAST(4, v_product_count)], v_prod_ids[LEAST(4, v_product_count)], 'Bowie', 'Flanger', 'bowie.f@outlook.com', '(503) 555-0807', 'Portland, OR', NOW() - INTERVAL '11 days'),
    (v_promo_ids[1], v_brand_id, v_qr_ids[LEAST(4, v_product_count)], v_prod_ids[LEAST(4, v_product_count)], 'Cassidy', 'Phaser', 'cassidy.p@yahoo.com', '(415) 555-0808', 'San Francisco, CA', NOW() - INTERVAL '13 days'),
    (v_promo_ids[1], v_brand_id, v_qr_ids[LEAST(5, v_product_count)], v_prod_ids[LEAST(5, v_product_count)], 'Vaughn', 'Overdrive', 'vaughn.od@gmail.com', '(303) 555-0809', 'Denver, CO', NOW() - INTERVAL '15 days'),
    (v_promo_ids[1], v_brand_id, v_qr_ids[LEAST(5, v_product_count)], v_prod_ids[LEAST(5, v_product_count)], 'Harmony', 'Delay', 'harmony.d@icloud.com', '(404) 555-0810', 'Atlanta, GA', NOW() - INTERVAL '17 days'),
    (v_promo_ids[1], v_brand_id, v_qr_ids[1], v_prod_ids[1], 'Zane', 'Sustain', 'zane.sustain@outlook.com', '(214) 555-0811', 'Dallas, TX', NOW() - INTERVAL '19 days'),
    (v_promo_ids[1], v_brand_id, v_qr_ids[1], v_prod_ids[1], 'Lyra', 'Chorus', 'lyra.chorus@gmail.com', '(713) 555-0812', 'Houston, TX', NOW() - INTERVAL '21 days');
    v_promo_entry_count := v_promo_entry_count + 12;
  END IF;

  IF v_promo_count >= 2 THEN
    -- Second promo gets ~8 entries
    INSERT INTO promo_entries (promo_id, brand_id, qr_code_id, product_id, first_name, last_name, email, phone, city, entered_at) VALUES
    (v_promo_ids[2], v_brand_id, v_qr_ids[1], v_prod_ids[1], 'Knox', 'Trembar', 'knox.trem@gmail.com', '(305) 555-0821', 'Miami, FL', NOW() - INTERVAL '2 days'),
    (v_promo_ids[2], v_brand_id, v_qr_ids[LEAST(2, v_product_count)], v_prod_ids[LEAST(2, v_product_count)], 'Sage', 'Harmonic', 'sage.harm@outlook.com', '(617) 555-0822', 'Boston, MA', NOW() - INTERVAL '5 days'),
    (v_promo_ids[2], v_brand_id, v_qr_ids[LEAST(3, v_product_count)], v_prod_ids[LEAST(3, v_product_count)], 'Axl', 'Compressor', 'axl.comp@yahoo.com', '(602) 555-0823', 'Phoenix, AZ', NOW() - INTERVAL '8 days'),
    (v_promo_ids[2], v_brand_id, v_qr_ids[LEAST(4, v_product_count)], v_prod_ids[LEAST(4, v_product_count)], 'Willa', 'Bridge', 'willa.bridge@icloud.com', '(619) 555-0824', 'San Diego, CA', NOW() - INTERVAL '11 days'),
    (v_promo_ids[2], v_brand_id, v_qr_ids[LEAST(5, v_product_count)], v_prod_ids[LEAST(5, v_product_count)], 'Lennon', 'Arpeggio', 'lennon.a@gmail.com', '(612) 555-0825', 'Minneapolis, MN', NOW() - INTERVAL '14 days'),
    (v_promo_ids[2], v_brand_id, v_qr_ids[1], v_prod_ids[1], 'Cadence', 'Vibrato', 'cadence.v@outlook.com', '(313) 555-0826', 'Detroit, MI', NOW() - INTERVAL '17 days'),
    (v_promo_ids[2], v_brand_id, v_qr_ids[LEAST(2, v_product_count)], v_prod_ids[LEAST(2, v_product_count)], 'Ryder', 'Legato', 'ryder.leg@gmail.com', '(215) 555-0827', 'Philadelphia, PA', NOW() - INTERVAL '19 days'),
    (v_promo_ids[2], v_brand_id, v_qr_ids[LEAST(3, v_product_count)], v_prod_ids[LEAST(3, v_product_count)], 'Aria', 'Staccato', 'aria.stacc@yahoo.com', '(314) 555-0828', 'St. Louis, MO', NOW() - INTERVAL '21 days');
    v_promo_entry_count := v_promo_entry_count + 8;
  END IF;

  -- Additional promos (3+) if they exist
  IF v_promo_count >= 3 THEN
    FOR v_idx IN 3..v_promo_count LOOP
      INSERT INTO promo_entries (promo_id, brand_id, qr_code_id, product_id, first_name, last_name, email, phone, city, entered_at) VALUES
      (v_promo_ids[v_idx], v_brand_id, v_qr_ids[1], v_prod_ids[1], 'Clyde', 'Fingerpick', 'clyde.fp' || v_idx || '@gmail.com', '(310) 555-08' || (30 + v_idx)::TEXT, 'Los Angeles, CA', NOW() - INTERVAL '3 days'),
      (v_promo_ids[v_idx], v_brand_id, v_qr_ids[LEAST(2, v_product_count)], v_prod_ids[LEAST(2, v_product_count)], 'Melody', 'Flatpick', 'melody.fp' || v_idx || '@outlook.com', '(615) 555-08' || (40 + v_idx)::TEXT, 'Nashville, TN', NOW() - INTERVAL '10 days');
      v_promo_entry_count := v_promo_entry_count + 2;
    END LOOP;
  END IF;

  RAISE NOTICE 'Inserted % promo entries', v_promo_entry_count;

  -- ============================================================
  -- EVENT ENTRIES (~15 total, spread across all events)
  -- Different names from VIP and promo names, last 14 days
  -- ============================================================

  IF v_event_count >= 1 THEN
    -- First event gets ~8 entries (or all 15 if only 1 event)
    INSERT INTO event_entries (event_id, brand_id, qr_code_id, first_name, last_name, email, phone, city, entered_at) VALUES
    (v_event_ids[1], v_brand_id, v_qr_ids[1], 'Hendrix', 'Cole', 'hendrix.cole@gmail.com', '(310) 555-0901', 'Los Angeles, CA', NOW() - INTERVAL '6 hours'),
    (v_event_ids[1], v_brand_id, v_qr_ids[LEAST(2, v_product_count)], 'Jolene', 'Harper', 'jolene.h@outlook.com', '(615) 555-0902', 'Nashville, TN', NOW() - INTERVAL '1 day'),
    (v_event_ids[1], v_brand_id, v_qr_ids[LEAST(3, v_product_count)], 'Coltrane', 'West', 'coltrane.w@yahoo.com', '(512) 555-0903', 'Austin, TX', NOW() - INTERVAL '2 days'),
    (v_event_ids[1], v_brand_id, v_qr_ids[1], 'Presley', 'Nova', 'presley.n@icloud.com', '(212) 555-0904', 'New York, NY', NOW() - INTERVAL '4 days'),
    (v_event_ids[1], v_brand_id, v_qr_ids[LEAST(4, v_product_count)], 'Gibson', 'Park', 'gibson.park@gmail.com', '(312) 555-0905', 'Chicago, IL', NOW() - INTERVAL '6 days'),
    (v_event_ids[1], v_brand_id, v_qr_ids[LEAST(5, v_product_count)], 'Savannah', 'Reed', 'savannah.reed@outlook.com', '(206) 555-0906', 'Seattle, WA', NOW() - INTERVAL '8 days'),
    (v_event_ids[1], v_brand_id, v_qr_ids[1], 'Marshall', 'Keane', 'marshall.k@gmail.com', '(303) 555-0907', 'Denver, CO', NOW() - INTERVAL '10 days'),
    (v_event_ids[1], v_brand_id, v_qr_ids[LEAST(2, v_product_count)], 'Dixie', 'Layne', 'dixie.layne@yahoo.com', '(404) 555-0908', 'Atlanta, GA', NOW() - INTERVAL '12 days');
    v_event_entry_count := v_event_entry_count + 8;
  END IF;

  IF v_event_count >= 2 THEN
    -- Second event gets ~7 entries
    INSERT INTO event_entries (event_id, brand_id, qr_code_id, first_name, last_name, email, phone, city, entered_at) VALUES
    (v_event_ids[2], v_brand_id, v_qr_ids[1], 'Clapton', 'Miles', 'clapton.miles@gmail.com', '(214) 555-0911', 'Dallas, TX', NOW() - INTERVAL '1 day'),
    (v_event_ids[2], v_brand_id, v_qr_ids[LEAST(3, v_product_count)], 'Emmylou', 'Stone', 'emmylou.stone@outlook.com', '(713) 555-0912', 'Houston, TX', NOW() - INTERVAL '3 days'),
    (v_event_ids[2], v_brand_id, v_qr_ids[LEAST(4, v_product_count)], 'Santana', 'Cruz', 'santana.cruz@icloud.com', '(305) 555-0913', 'Miami, FL', NOW() - INTERVAL '5 days'),
    (v_event_ids[2], v_brand_id, v_qr_ids[LEAST(5, v_product_count)], 'Bonham', 'Ray', 'bonham.ray@yahoo.com', '(617) 555-0914', 'Boston, MA', NOW() - INTERVAL '7 days'),
    (v_event_ids[2], v_brand_id, v_qr_ids[1], 'Loretta', 'Vox', 'loretta.vox@gmail.com', '(602) 555-0915', 'Phoenix, AZ', NOW() - INTERVAL '9 days'),
    (v_event_ids[2], v_brand_id, v_qr_ids[LEAST(2, v_product_count)], 'Townes', 'Fret', 'townes.fret@outlook.com', '(619) 555-0916', 'San Diego, CA', NOW() - INTERVAL '11 days'),
    (v_event_ids[2], v_brand_id, v_qr_ids[LEAST(3, v_product_count)], 'Dolly', 'Keyes', 'dolly.keyes@gmail.com', '(612) 555-0917', 'Minneapolis, MN', NOW() - INTERVAL '13 days');
    v_event_entry_count := v_event_entry_count + 7;
  END IF;

  -- Additional events (3+) if they exist
  IF v_event_count >= 3 THEN
    FOR v_idx IN 3..v_event_count LOOP
      INSERT INTO event_entries (event_id, brand_id, qr_code_id, first_name, last_name, email, phone, city, entered_at) VALUES
      (v_event_ids[v_idx], v_brand_id, v_qr_ids[1], 'Waylon', 'Amp' || v_idx, 'waylon.amp' || v_idx || '@gmail.com', '(615) 555-09' || (20 + v_idx)::TEXT, 'Nashville, TN', NOW() - INTERVAL '2 days'),
      (v_event_ids[v_idx], v_brand_id, v_qr_ids[LEAST(2, v_product_count)], 'June', 'Tone' || v_idx, 'june.tone' || v_idx || '@outlook.com', '(512) 555-09' || (30 + v_idx)::TEXT, 'Austin, TX', NOW() - INTERVAL '7 days');
      v_event_entry_count := v_event_entry_count + 2;
    END LOOP;
  END IF;

  RAISE NOTICE 'Inserted % event entries', v_event_entry_count;

  -- ============================================================
  -- SUMMARY
  -- ============================================================
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Fender seed data complete!';
  RAISE NOTICE 'Brand: % (apply@cobbcohunters.com)', v_brand_id;
  RAISE NOTICE 'Products found: %', v_product_count;
  RAISE NOTICE 'Promos found: %', v_promo_count;
  RAISE NOTICE 'Events found: %', v_event_count;
  RAISE NOTICE 'Scans inserted: %', v_scan_count;
  RAISE NOTICE 'VIP members inserted: %', v_vip_count;
  RAISE NOTICE 'Promo entries inserted: %', v_promo_entry_count;
  RAISE NOTICE 'Event entries inserted: %', v_event_entry_count;
  RAISE NOTICE '========================================';
END $$;
