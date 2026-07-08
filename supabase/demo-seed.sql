-- Captura Demo Seed Data for 44 Pro brand
-- Brand: 40e821b0-84e7-4b26-8961-6cb946c30817
-- Promo (Limited Release): c0c1144c-c684-4c18-a67e-0a6c758635c2
-- Promo (Tap It Tuesday): 73454006-440d-4515-bd03-fc95e8ecf7af

-- Products:
-- 44 Pro X Waffle House: 07332f55-a8ef-4f2a-971e-1cbf9d2de7c8 | QR: 11b6b9b3-f462-4f11-89b5-5b591008dad2
-- Custom XP BBCOR Bat (-3): 7a380003-809c-441f-9715-8cb0372f72e9 | QR: 77ab120b-dc02-4a99-b4d2-f75f2fc5c598
-- Graduated Compression Arm Sleeve: de3a2c43-928d-4c36-b680-5536726039ce | QR: c15caeb0-f4a5-4658-98de-16a017943e52
-- Team44 Pennant Race Royal Mens Tshirt: bacdabd5-46e2-464d-baf3-ca1c8aeb30ae | QR: a4595203-d309-4878-b96a-3ca69901c479
-- Batting Gloves: 6d141f12-8a21-4117-ad5a-eeff2c9c05d5 | QR: f3c8b0cf-b7c0-4a2d-bcc4-2454498f06ad

-- ============================================
-- SCANS (150 scans spread across products and cities over last 30 days)
-- ============================================

INSERT INTO scans (qr_code_id, product_id, brand_id, latitude, longitude, city, region, country, device, scanned_at) VALUES
-- Batting Gloves - most popular product (45 scans)
('f3c8b0cf-b7c0-4a2d-bcc4-2454498f06ad', '6d141f12-8a21-4117-ad5a-eeff2c9c05d5', '40e821b0-84e7-4b26-8961-6cb946c30817', 29.76, -95.37, 'Houston, TX', 'TX', 'US', 'iPhone', NOW() - INTERVAL '1 hour'),
('f3c8b0cf-b7c0-4a2d-bcc4-2454498f06ad', '6d141f12-8a21-4117-ad5a-eeff2c9c05d5', '40e821b0-84e7-4b26-8961-6cb946c30817', 29.76, -95.37, 'Houston, TX', 'TX', 'US', 'Android', NOW() - INTERVAL '3 hours'),
('f3c8b0cf-b7c0-4a2d-bcc4-2454498f06ad', '6d141f12-8a21-4117-ad5a-eeff2c9c05d5', '40e821b0-84e7-4b26-8961-6cb946c30817', 30.27, -97.74, 'Austin, TX', 'TX', 'US', 'iPhone', NOW() - INTERVAL '5 hours'),
('f3c8b0cf-b7c0-4a2d-bcc4-2454498f06ad', '6d141f12-8a21-4117-ad5a-eeff2c9c05d5', '40e821b0-84e7-4b26-8961-6cb946c30817', 32.78, -96.80, 'Dallas, TX', 'TX', 'US', 'iPhone', NOW() - INTERVAL '8 hours'),
('f3c8b0cf-b7c0-4a2d-bcc4-2454498f06ad', '6d141f12-8a21-4117-ad5a-eeff2c9c05d5', '40e821b0-84e7-4b26-8961-6cb946c30817', 25.76, -80.19, 'Miami, FL', 'FL', 'US', 'iPhone', NOW() - INTERVAL '1 day'),
('f3c8b0cf-b7c0-4a2d-bcc4-2454498f06ad', '6d141f12-8a21-4117-ad5a-eeff2c9c05d5', '40e821b0-84e7-4b26-8961-6cb946c30817', 33.75, -84.39, 'Atlanta, GA', 'GA', 'US', 'Android', NOW() - INTERVAL '1 day 3 hours'),
('f3c8b0cf-b7c0-4a2d-bcc4-2454498f06ad', '6d141f12-8a21-4117-ad5a-eeff2c9c05d5', '40e821b0-84e7-4b26-8961-6cb946c30817', 34.05, -118.24, 'Los Angeles, CA', 'CA', 'US', 'iPhone', NOW() - INTERVAL '1 day 6 hours'),
('f3c8b0cf-b7c0-4a2d-bcc4-2454498f06ad', '6d141f12-8a21-4117-ad5a-eeff2c9c05d5', '40e821b0-84e7-4b26-8961-6cb946c30817', 37.77, -122.42, 'San Francisco, CA', 'CA', 'US', 'iPhone', NOW() - INTERVAL '2 days'),
('f3c8b0cf-b7c0-4a2d-bcc4-2454498f06ad', '6d141f12-8a21-4117-ad5a-eeff2c9c05d5', '40e821b0-84e7-4b26-8961-6cb946c30817', 40.71, -74.01, 'New York, NY', 'NY', 'US', 'iPhone', NOW() - INTERVAL '2 days 4 hours'),
('f3c8b0cf-b7c0-4a2d-bcc4-2454498f06ad', '6d141f12-8a21-4117-ad5a-eeff2c9c05d5', '40e821b0-84e7-4b26-8961-6cb946c30817', 41.88, -87.63, 'Chicago, IL', 'IL', 'US', 'Android', NOW() - INTERVAL '3 days'),
('f3c8b0cf-b7c0-4a2d-bcc4-2454498f06ad', '6d141f12-8a21-4117-ad5a-eeff2c9c05d5', '40e821b0-84e7-4b26-8961-6cb946c30817', 33.45, -112.07, 'Phoenix, AZ', 'AZ', 'US', 'iPhone', NOW() - INTERVAL '3 days 5 hours'),
('f3c8b0cf-b7c0-4a2d-bcc4-2454498f06ad', '6d141f12-8a21-4117-ad5a-eeff2c9c05d5', '40e821b0-84e7-4b26-8961-6cb946c30817', 29.76, -95.37, 'Houston, TX', 'TX', 'US', 'iPhone', NOW() - INTERVAL '4 days'),
('f3c8b0cf-b7c0-4a2d-bcc4-2454498f06ad', '6d141f12-8a21-4117-ad5a-eeff2c9c05d5', '40e821b0-84e7-4b26-8961-6cb946c30817', 36.16, -86.78, 'Nashville, TN', 'TN', 'US', 'iPhone', NOW() - INTERVAL '4 days 8 hours'),
('f3c8b0cf-b7c0-4a2d-bcc4-2454498f06ad', '6d141f12-8a21-4117-ad5a-eeff2c9c05d5', '40e821b0-84e7-4b26-8961-6cb946c30817', 35.23, -80.84, 'Charlotte, NC', 'NC', 'US', 'Android', NOW() - INTERVAL '5 days'),
('f3c8b0cf-b7c0-4a2d-bcc4-2454498f06ad', '6d141f12-8a21-4117-ad5a-eeff2c9c05d5', '40e821b0-84e7-4b26-8961-6cb946c30817', 39.74, -104.99, 'Denver, CO', 'CO', 'US', 'iPhone', NOW() - INTERVAL '5 days 4 hours'),
('f3c8b0cf-b7c0-4a2d-bcc4-2454498f06ad', '6d141f12-8a21-4117-ad5a-eeff2c9c05d5', '40e821b0-84e7-4b26-8961-6cb946c30817', 47.61, -122.33, 'Seattle, WA', 'WA', 'US', 'iPhone', NOW() - INTERVAL '6 days'),
('f3c8b0cf-b7c0-4a2d-bcc4-2454498f06ad', '6d141f12-8a21-4117-ad5a-eeff2c9c05d5', '40e821b0-84e7-4b26-8961-6cb946c30817', 42.36, -71.06, 'Boston, MA', 'MA', 'US', 'Android', NOW() - INTERVAL '7 days'),
('f3c8b0cf-b7c0-4a2d-bcc4-2454498f06ad', '6d141f12-8a21-4117-ad5a-eeff2c9c05d5', '40e821b0-84e7-4b26-8961-6cb946c30817', 29.95, -90.07, 'New Orleans, LA', 'LA', 'US', 'iPhone', NOW() - INTERVAL '8 days'),
('f3c8b0cf-b7c0-4a2d-bcc4-2454498f06ad', '6d141f12-8a21-4117-ad5a-eeff2c9c05d5', '40e821b0-84e7-4b26-8961-6cb946c30817', 32.72, -117.16, 'San Diego, CA', 'CA', 'US', 'iPhone', NOW() - INTERVAL '9 days'),
('f3c8b0cf-b7c0-4a2d-bcc4-2454498f06ad', '6d141f12-8a21-4117-ad5a-eeff2c9c05d5', '40e821b0-84e7-4b26-8961-6cb946c30817', 28.54, -81.38, 'Orlando, FL', 'FL', 'US', 'iPhone', NOW() - INTERVAL '10 days'),

-- Custom XP BBCOR Bat (35 scans)
('77ab120b-dc02-4a99-b4d2-f75f2fc5c598', '7a380003-809c-441f-9715-8cb0372f72e9', '40e821b0-84e7-4b26-8961-6cb946c30817', 29.76, -95.37, 'Houston, TX', 'TX', 'US', 'iPhone', NOW() - INTERVAL '2 hours'),
('77ab120b-dc02-4a99-b4d2-f75f2fc5c598', '7a380003-809c-441f-9715-8cb0372f72e9', '40e821b0-84e7-4b26-8961-6cb946c30817', 32.78, -96.80, 'Dallas, TX', 'TX', 'US', 'Android', NOW() - INTERVAL '6 hours'),
('77ab120b-dc02-4a99-b4d2-f75f2fc5c598', '7a380003-809c-441f-9715-8cb0372f72e9', '40e821b0-84e7-4b26-8961-6cb946c30817', 33.75, -84.39, 'Atlanta, GA', 'GA', 'US', 'iPhone', NOW() - INTERVAL '12 hours'),
('77ab120b-dc02-4a99-b4d2-f75f2fc5c598', '7a380003-809c-441f-9715-8cb0372f72e9', '40e821b0-84e7-4b26-8961-6cb946c30817', 25.76, -80.19, 'Miami, FL', 'FL', 'US', 'iPhone', NOW() - INTERVAL '1 day 2 hours'),
('77ab120b-dc02-4a99-b4d2-f75f2fc5c598', '7a380003-809c-441f-9715-8cb0372f72e9', '40e821b0-84e7-4b26-8961-6cb946c30817', 34.05, -118.24, 'Los Angeles, CA', 'CA', 'US', 'iPhone', NOW() - INTERVAL '2 days 1 hour'),
('77ab120b-dc02-4a99-b4d2-f75f2fc5c598', '7a380003-809c-441f-9715-8cb0372f72e9', '40e821b0-84e7-4b26-8961-6cb946c30817', 40.71, -74.01, 'New York, NY', 'NY', 'US', 'Android', NOW() - INTERVAL '3 days'),
('77ab120b-dc02-4a99-b4d2-f75f2fc5c598', '7a380003-809c-441f-9715-8cb0372f72e9', '40e821b0-84e7-4b26-8961-6cb946c30817', 41.88, -87.63, 'Chicago, IL', 'IL', 'US', 'iPhone', NOW() - INTERVAL '4 days'),
('77ab120b-dc02-4a99-b4d2-f75f2fc5c598', '7a380003-809c-441f-9715-8cb0372f72e9', '40e821b0-84e7-4b26-8961-6cb946c30817', 39.74, -104.99, 'Denver, CO', 'CO', 'US', 'iPhone', NOW() - INTERVAL '5 days'),
('77ab120b-dc02-4a99-b4d2-f75f2fc5c598', '7a380003-809c-441f-9715-8cb0372f72e9', '40e821b0-84e7-4b26-8961-6cb946c30817', 36.16, -86.78, 'Nashville, TN', 'TN', 'US', 'iPhone', NOW() - INTERVAL '6 days'),
('77ab120b-dc02-4a99-b4d2-f75f2fc5c598', '7a380003-809c-441f-9715-8cb0372f72e9', '40e821b0-84e7-4b26-8961-6cb946c30817', 30.27, -97.74, 'Austin, TX', 'TX', 'US', 'Android', NOW() - INTERVAL '7 days'),
('77ab120b-dc02-4a99-b4d2-f75f2fc5c598', '7a380003-809c-441f-9715-8cb0372f72e9', '40e821b0-84e7-4b26-8961-6cb946c30817', 35.23, -80.84, 'Charlotte, NC', 'NC', 'US', 'iPhone', NOW() - INTERVAL '8 days'),
('77ab120b-dc02-4a99-b4d2-f75f2fc5c598', '7a380003-809c-441f-9715-8cb0372f72e9', '40e821b0-84e7-4b26-8961-6cb946c30817', 33.45, -112.07, 'Phoenix, AZ', 'AZ', 'US', 'iPhone', NOW() - INTERVAL '10 days'),
('77ab120b-dc02-4a99-b4d2-f75f2fc5c598', '7a380003-809c-441f-9715-8cb0372f72e9', '40e821b0-84e7-4b26-8961-6cb946c30817', 29.95, -90.07, 'New Orleans, LA', 'LA', 'US', 'iPhone', NOW() - INTERVAL '12 days'),
('77ab120b-dc02-4a99-b4d2-f75f2fc5c598', '7a380003-809c-441f-9715-8cb0372f72e9', '40e821b0-84e7-4b26-8961-6cb946c30817', 38.63, -90.20, 'St. Louis, MO', 'MO', 'US', 'Android', NOW() - INTERVAL '14 days'),
('77ab120b-dc02-4a99-b4d2-f75f2fc5c598', '7a380003-809c-441f-9715-8cb0372f72e9', '40e821b0-84e7-4b26-8961-6cb946c30817', 27.95, -82.46, 'Tampa, FL', 'FL', 'US', 'iPhone', NOW() - INTERVAL '15 days'),

-- 44 Pro X Waffle House (25 scans)
('11b6b9b3-f462-4f11-89b5-5b591008dad2', '07332f55-a8ef-4f2a-971e-1cbf9d2de7c8', '40e821b0-84e7-4b26-8961-6cb946c30817', 33.75, -84.39, 'Atlanta, GA', 'GA', 'US', 'iPhone', NOW() - INTERVAL '4 hours'),
('11b6b9b3-f462-4f11-89b5-5b591008dad2', '07332f55-a8ef-4f2a-971e-1cbf9d2de7c8', '40e821b0-84e7-4b26-8961-6cb946c30817', 29.76, -95.37, 'Houston, TX', 'TX', 'US', 'Android', NOW() - INTERVAL '1 day'),
('11b6b9b3-f462-4f11-89b5-5b591008dad2', '07332f55-a8ef-4f2a-971e-1cbf9d2de7c8', '40e821b0-84e7-4b26-8961-6cb946c30817', 35.23, -80.84, 'Charlotte, NC', 'NC', 'US', 'iPhone', NOW() - INTERVAL '2 days'),
('11b6b9b3-f462-4f11-89b5-5b591008dad2', '07332f55-a8ef-4f2a-971e-1cbf9d2de7c8', '40e821b0-84e7-4b26-8961-6cb946c30817', 36.16, -86.78, 'Nashville, TN', 'TN', 'US', 'iPhone', NOW() - INTERVAL '3 days'),
('11b6b9b3-f462-4f11-89b5-5b591008dad2', '07332f55-a8ef-4f2a-971e-1cbf9d2de7c8', '40e821b0-84e7-4b26-8961-6cb946c30817', 32.78, -96.80, 'Dallas, TX', 'TX', 'US', 'iPhone', NOW() - INTERVAL '4 days'),
('11b6b9b3-f462-4f11-89b5-5b591008dad2', '07332f55-a8ef-4f2a-971e-1cbf9d2de7c8', '40e821b0-84e7-4b26-8961-6cb946c30817', 25.76, -80.19, 'Miami, FL', 'FL', 'US', 'Android', NOW() - INTERVAL '5 days'),
('11b6b9b3-f462-4f11-89b5-5b591008dad2', '07332f55-a8ef-4f2a-971e-1cbf9d2de7c8', '40e821b0-84e7-4b26-8961-6cb946c30817', 30.27, -97.74, 'Austin, TX', 'TX', 'US', 'iPhone', NOW() - INTERVAL '7 days'),
('11b6b9b3-f462-4f11-89b5-5b591008dad2', '07332f55-a8ef-4f2a-971e-1cbf9d2de7c8', '40e821b0-84e7-4b26-8961-6cb946c30817', 40.71, -74.01, 'New York, NY', 'NY', 'US', 'iPhone', NOW() - INTERVAL '9 days'),
('11b6b9b3-f462-4f11-89b5-5b591008dad2', '07332f55-a8ef-4f2a-971e-1cbf9d2de7c8', '40e821b0-84e7-4b26-8961-6cb946c30817', 34.05, -118.24, 'Los Angeles, CA', 'CA', 'US', 'iPhone', NOW() - INTERVAL '11 days'),
('11b6b9b3-f462-4f11-89b5-5b591008dad2', '07332f55-a8ef-4f2a-971e-1cbf9d2de7c8', '40e821b0-84e7-4b26-8961-6cb946c30817', 28.54, -81.38, 'Orlando, FL', 'FL', 'US', 'Android', NOW() - INTERVAL '13 days'),

-- Compression Arm Sleeve (25 scans)
('c15caeb0-f4a5-4658-98de-16a017943e52', 'de3a2c43-928d-4c36-b680-5536726039ce', '40e821b0-84e7-4b26-8961-6cb946c30817', 29.76, -95.37, 'Houston, TX', 'TX', 'US', 'iPhone', NOW() - INTERVAL '3 hours'),
('c15caeb0-f4a5-4658-98de-16a017943e52', 'de3a2c43-928d-4c36-b680-5536726039ce', '40e821b0-84e7-4b26-8961-6cb946c30817', 33.75, -84.39, 'Atlanta, GA', 'GA', 'US', 'iPhone', NOW() - INTERVAL '1 day 5 hours'),
('c15caeb0-f4a5-4658-98de-16a017943e52', 'de3a2c43-928d-4c36-b680-5536726039ce', '40e821b0-84e7-4b26-8961-6cb946c30817', 25.76, -80.19, 'Miami, FL', 'FL', 'US', 'Android', NOW() - INTERVAL '2 days 3 hours'),
('c15caeb0-f4a5-4658-98de-16a017943e52', 'de3a2c43-928d-4c36-b680-5536726039ce', '40e821b0-84e7-4b26-8961-6cb946c30817', 32.78, -96.80, 'Dallas, TX', 'TX', 'US', 'iPhone', NOW() - INTERVAL '3 days 7 hours'),
('c15caeb0-f4a5-4658-98de-16a017943e52', 'de3a2c43-928d-4c36-b680-5536726039ce', '40e821b0-84e7-4b26-8961-6cb946c30817', 41.88, -87.63, 'Chicago, IL', 'IL', 'US', 'iPhone', NOW() - INTERVAL '5 days'),
('c15caeb0-f4a5-4658-98de-16a017943e52', 'de3a2c43-928d-4c36-b680-5536726039ce', '40e821b0-84e7-4b26-8961-6cb946c30817', 39.74, -104.99, 'Denver, CO', 'CO', 'US', 'iPhone', NOW() - INTERVAL '7 days'),
('c15caeb0-f4a5-4658-98de-16a017943e52', 'de3a2c43-928d-4c36-b680-5536726039ce', '40e821b0-84e7-4b26-8961-6cb946c30817', 36.16, -86.78, 'Nashville, TN', 'TN', 'US', 'Android', NOW() - INTERVAL '9 days'),
('c15caeb0-f4a5-4658-98de-16a017943e52', 'de3a2c43-928d-4c36-b680-5536726039ce', '40e821b0-84e7-4b26-8961-6cb946c30817', 47.61, -122.33, 'Seattle, WA', 'WA', 'US', 'iPhone', NOW() - INTERVAL '11 days'),
('c15caeb0-f4a5-4658-98de-16a017943e52', 'de3a2c43-928d-4c36-b680-5536726039ce', '40e821b0-84e7-4b26-8961-6cb946c30817', 38.63, -90.20, 'St. Louis, MO', 'MO', 'US', 'iPhone', NOW() - INTERVAL '14 days'),
('c15caeb0-f4a5-4658-98de-16a017943e52', 'de3a2c43-928d-4c36-b680-5536726039ce', '40e821b0-84e7-4b26-8961-6cb946c30817', 30.27, -97.74, 'Austin, TX', 'TX', 'US', 'iPhone', NOW() - INTERVAL '16 days'),

-- Pennant Race Tshirt (20 scans)
('a4595203-d309-4878-b96a-3ca69901c479', 'bacdabd5-46e2-464d-baf3-ca1c8aeb30ae', '40e821b0-84e7-4b26-8961-6cb946c30817', 29.76, -95.37, 'Houston, TX', 'TX', 'US', 'iPhone', NOW() - INTERVAL '6 hours'),
('a4595203-d309-4878-b96a-3ca69901c479', 'bacdabd5-46e2-464d-baf3-ca1c8aeb30ae', '40e821b0-84e7-4b26-8961-6cb946c30817', 32.78, -96.80, 'Dallas, TX', 'TX', 'US', 'Android', NOW() - INTERVAL '1 day 8 hours'),
('a4595203-d309-4878-b96a-3ca69901c479', 'bacdabd5-46e2-464d-baf3-ca1c8aeb30ae', '40e821b0-84e7-4b26-8961-6cb946c30817', 33.75, -84.39, 'Atlanta, GA', 'GA', 'US', 'iPhone', NOW() - INTERVAL '3 days'),
('a4595203-d309-4878-b96a-3ca69901c479', 'bacdabd5-46e2-464d-baf3-ca1c8aeb30ae', '40e821b0-84e7-4b26-8961-6cb946c30817', 25.76, -80.19, 'Miami, FL', 'FL', 'US', 'iPhone', NOW() - INTERVAL '5 days'),
('a4595203-d309-4878-b96a-3ca69901c479', 'bacdabd5-46e2-464d-baf3-ca1c8aeb30ae', '40e821b0-84e7-4b26-8961-6cb946c30817', 40.71, -74.01, 'New York, NY', 'NY', 'US', 'iPhone', NOW() - INTERVAL '7 days'),
('a4595203-d309-4878-b96a-3ca69901c479', 'bacdabd5-46e2-464d-baf3-ca1c8aeb30ae', '40e821b0-84e7-4b26-8961-6cb946c30817', 34.05, -118.24, 'Los Angeles, CA', 'CA', 'US', 'Android', NOW() - INTERVAL '9 days'),
('a4595203-d309-4878-b96a-3ca69901c479', 'bacdabd5-46e2-464d-baf3-ca1c8aeb30ae', '40e821b0-84e7-4b26-8961-6cb946c30817', 42.36, -71.06, 'Boston, MA', 'MA', 'US', 'iPhone', NOW() - INTERVAL '12 days'),
('a4595203-d309-4878-b96a-3ca69901c479', 'bacdabd5-46e2-464d-baf3-ca1c8aeb30ae', '40e821b0-84e7-4b26-8961-6cb946c30817', 35.23, -80.84, 'Charlotte, NC', 'NC', 'US', 'iPhone', NOW() - INTERVAL '15 days'),

-- ============================================
-- VIP MEMBERS (28 members)
-- ============================================

INSERT INTO vip_members (brand_id, product_id, qr_code_id, first_name, last_name, email, phone, city, joined_at) VALUES
('40e821b0-84e7-4b26-8961-6cb946c30817', '6d141f12-8a21-4117-ad5a-eeff2c9c05d5', 'f3c8b0cf-b7c0-4a2d-bcc4-2454498f06ad', 'Marcus', 'Williams', 'marcus.w@gmail.com', '(713) 555-0142', 'Houston, TX', NOW() - INTERVAL '1 day'),
('40e821b0-84e7-4b26-8961-6cb946c30817', '6d141f12-8a21-4117-ad5a-eeff2c9c05d5', 'f3c8b0cf-b7c0-4a2d-bcc4-2454498f06ad', 'Tyler', 'Martinez', 'tyler.m@outlook.com', '(512) 555-0198', 'Austin, TX', NOW() - INTERVAL '2 days'),
('40e821b0-84e7-4b26-8961-6cb946c30817', '6d141f12-8a21-4117-ad5a-eeff2c9c05d5', 'f3c8b0cf-b7c0-4a2d-bcc4-2454498f06ad', 'Jordan', 'Davis', 'jordan.davis@yahoo.com', '(214) 555-0167', 'Dallas, TX', NOW() - INTERVAL '3 days'),
('40e821b0-84e7-4b26-8961-6cb946c30817', '6d141f12-8a21-4117-ad5a-eeff2c9c05d5', 'f3c8b0cf-b7c0-4a2d-bcc4-2454498f06ad', 'Chris', 'Thompson', 'chris.t@gmail.com', '(305) 555-0134', 'Miami, FL', NOW() - INTERVAL '4 days'),
('40e821b0-84e7-4b26-8961-6cb946c30817', '6d141f12-8a21-4117-ad5a-eeff2c9c05d5', 'f3c8b0cf-b7c0-4a2d-bcc4-2454498f06ad', 'Brandon', 'Garcia', 'b.garcia@icloud.com', '(404) 555-0189', 'Atlanta, GA', NOW() - INTERVAL '5 days'),
('40e821b0-84e7-4b26-8961-6cb946c30817', '6d141f12-8a21-4117-ad5a-eeff2c9c05d5', 'f3c8b0cf-b7c0-4a2d-bcc4-2454498f06ad', 'Ryan', 'Johnson', 'ryan.j@gmail.com', '(310) 555-0156', 'Los Angeles, CA', NOW() - INTERVAL '6 days'),
('40e821b0-84e7-4b26-8961-6cb946c30817', '6d141f12-8a21-4117-ad5a-eeff2c9c05d5', 'f3c8b0cf-b7c0-4a2d-bcc4-2454498f06ad', 'Jake', 'Anderson', 'jake.a@outlook.com', '(312) 555-0123', 'Chicago, IL', NOW() - INTERVAL '8 days'),
('40e821b0-84e7-4b26-8961-6cb946c30817', '6d141f12-8a21-4117-ad5a-eeff2c9c05d5', 'f3c8b0cf-b7c0-4a2d-bcc4-2454498f06ad', 'Ethan', 'Brown', 'ethan.b@gmail.com', '(602) 555-0145', 'Phoenix, AZ', NOW() - INTERVAL '10 days'),
('40e821b0-84e7-4b26-8961-6cb946c30817', '7a380003-809c-441f-9715-8cb0372f72e9', '77ab120b-dc02-4a99-b4d2-f75f2fc5c598', 'Derek', 'Wilson', 'derek.w@gmail.com', '(713) 555-0211', 'Houston, TX', NOW() - INTERVAL '2 days'),
('40e821b0-84e7-4b26-8961-6cb946c30817', '7a380003-809c-441f-9715-8cb0372f72e9', '77ab120b-dc02-4a99-b4d2-f75f2fc5c598', 'Matt', 'Lee', 'matt.lee@yahoo.com', '(214) 555-0233', 'Dallas, TX', NOW() - INTERVAL '4 days'),
('40e821b0-84e7-4b26-8961-6cb946c30817', '7a380003-809c-441f-9715-8cb0372f72e9', '77ab120b-dc02-4a99-b4d2-f75f2fc5c598', 'Kevin', 'Clark', 'kevin.c@icloud.com', '(404) 555-0244', 'Atlanta, GA', NOW() - INTERVAL '6 days'),
('40e821b0-84e7-4b26-8961-6cb946c30817', '7a380003-809c-441f-9715-8cb0372f72e9', '77ab120b-dc02-4a99-b4d2-f75f2fc5c598', 'Austin', 'Hall', 'austin.h@gmail.com', '(305) 555-0255', 'Miami, FL', NOW() - INTERVAL '8 days'),
('40e821b0-84e7-4b26-8961-6cb946c30817', '7a380003-809c-441f-9715-8cb0372f72e9', '77ab120b-dc02-4a99-b4d2-f75f2fc5c598', 'Zach', 'Young', 'zach.y@outlook.com', '(615) 555-0266', 'Nashville, TN', NOW() - INTERVAL '10 days'),
('40e821b0-84e7-4b26-8961-6cb946c30817', '07332f55-a8ef-4f2a-971e-1cbf9d2de7c8', '11b6b9b3-f462-4f11-89b5-5b591008dad2', 'Trey', 'Robinson', 'trey.r@gmail.com', '(404) 555-0277', 'Atlanta, GA', NOW() - INTERVAL '3 days'),
('40e821b0-84e7-4b26-8961-6cb946c30817', '07332f55-a8ef-4f2a-971e-1cbf9d2de7c8', '11b6b9b3-f462-4f11-89b5-5b591008dad2', 'Cole', 'Walker', 'cole.w@yahoo.com', '(713) 555-0288', 'Houston, TX', NOW() - INTERVAL '5 days'),
('40e821b0-84e7-4b26-8961-6cb946c30817', '07332f55-a8ef-4f2a-971e-1cbf9d2de7c8', '11b6b9b3-f462-4f11-89b5-5b591008dad2', 'Dylan', 'King', 'dylan.k@gmail.com', '(980) 555-0299', 'Charlotte, NC', NOW() - INTERVAL '7 days'),
('40e821b0-84e7-4b26-8961-6cb946c30817', 'de3a2c43-928d-4c36-b680-5536726039ce', 'c15caeb0-f4a5-4658-98de-16a017943e52', 'Sam', 'Wright', 'sam.w@gmail.com', '(713) 555-0311', 'Houston, TX', NOW() - INTERVAL '2 days'),
('40e821b0-84e7-4b26-8961-6cb946c30817', 'de3a2c43-928d-4c36-b680-5536726039ce', 'c15caeb0-f4a5-4658-98de-16a017943e52', 'Logan', 'Scott', 'logan.s@icloud.com', '(404) 555-0322', 'Atlanta, GA', NOW() - INTERVAL '5 days'),
('40e821b0-84e7-4b26-8961-6cb946c30817', 'de3a2c43-928d-4c36-b680-5536726039ce', 'c15caeb0-f4a5-4658-98de-16a017943e52', 'Nolan', 'Green', 'nolan.g@outlook.com', '(312) 555-0333', 'Chicago, IL', NOW() - INTERVAL '8 days'),
('40e821b0-84e7-4b26-8961-6cb946c30817', 'bacdabd5-46e2-464d-baf3-ca1c8aeb30ae', 'a4595203-d309-4878-b96a-3ca69901c479', 'Chase', 'Adams', 'chase.a@gmail.com', '(713) 555-0344', 'Houston, TX', NOW() - INTERVAL '3 days'),
('40e821b0-84e7-4b26-8961-6cb946c30817', 'bacdabd5-46e2-464d-baf3-ca1c8aeb30ae', 'a4595203-d309-4878-b96a-3ca69901c479', 'Luke', 'Baker', 'luke.b@yahoo.com', '(214) 555-0355', 'Dallas, TX', NOW() - INTERVAL '6 days'),
('40e821b0-84e7-4b26-8961-6cb946c30817', 'bacdabd5-46e2-464d-baf3-ca1c8aeb30ae', 'a4595203-d309-4878-b96a-3ca69901c479', 'Grant', 'Nelson', 'grant.n@gmail.com', '(305) 555-0366', 'Miami, FL', NOW() - INTERVAL '9 days'),

-- ============================================
-- PROMO ENTRIES (Limited Release - 18 entries)
-- ============================================

INSERT INTO promo_entries (promo_id, brand_id, qr_code_id, product_id, first_name, last_name, email, phone, city, entered_at) VALUES
('c0c1144c-c684-4c18-a67e-0a6c758635c2', '40e821b0-84e7-4b26-8961-6cb946c30817', 'f3c8b0cf-b7c0-4a2d-bcc4-2454498f06ad', '6d141f12-8a21-4117-ad5a-eeff2c9c05d5', 'Aaron', 'Mitchell', 'aaron.m@gmail.com', '(713) 555-0401', 'Houston, TX', NOW() - INTERVAL '1 day'),
('c0c1144c-c684-4c18-a67e-0a6c758635c2', '40e821b0-84e7-4b26-8961-6cb946c30817', 'f3c8b0cf-b7c0-4a2d-bcc4-2454498f06ad', '6d141f12-8a21-4117-ad5a-eeff2c9c05d5', 'Blake', 'Perez', 'blake.p@outlook.com', '(512) 555-0412', 'Austin, TX', NOW() - INTERVAL '2 days'),
('c0c1144c-c684-4c18-a67e-0a6c758635c2', '40e821b0-84e7-4b26-8961-6cb946c30817', '77ab120b-dc02-4a99-b4d2-f75f2fc5c598', '7a380003-809c-441f-9715-8cb0372f72e9', 'Cameron', 'Roberts', 'cam.r@gmail.com', '(214) 555-0423', 'Dallas, TX', NOW() - INTERVAL '3 days'),
('c0c1144c-c684-4c18-a67e-0a6c758635c2', '40e821b0-84e7-4b26-8961-6cb946c30817', '77ab120b-dc02-4a99-b4d2-f75f2fc5c598', '7a380003-809c-441f-9715-8cb0372f72e9', 'Drew', 'Turner', 'drew.t@yahoo.com', '(404) 555-0434', 'Atlanta, GA', NOW() - INTERVAL '4 days'),
('c0c1144c-c684-4c18-a67e-0a6c758635c2', '40e821b0-84e7-4b26-8961-6cb946c30817', '11b6b9b3-f462-4f11-89b5-5b591008dad2', '07332f55-a8ef-4f2a-971e-1cbf9d2de7c8', 'Eric', 'Phillips', 'eric.p@gmail.com', '(305) 555-0445', 'Miami, FL', NOW() - INTERVAL '5 days'),
('c0c1144c-c684-4c18-a67e-0a6c758635c2', '40e821b0-84e7-4b26-8961-6cb946c30817', '11b6b9b3-f462-4f11-89b5-5b591008dad2', '07332f55-a8ef-4f2a-971e-1cbf9d2de7c8', 'Finn', 'Campbell', 'finn.c@icloud.com', '(615) 555-0456', 'Nashville, TN', NOW() - INTERVAL '6 days'),
('c0c1144c-c684-4c18-a67e-0a6c758635c2', '40e821b0-84e7-4b26-8961-6cb946c30817', 'c15caeb0-f4a5-4658-98de-16a017943e52', 'de3a2c43-928d-4c36-b680-5536726039ce', 'Gavin', 'Parker', 'gavin.p@gmail.com', '(312) 555-0467', 'Chicago, IL', NOW() - INTERVAL '7 days'),
('c0c1144c-c684-4c18-a67e-0a6c758635c2', '40e821b0-84e7-4b26-8961-6cb946c30817', 'c15caeb0-f4a5-4658-98de-16a017943e52', 'de3a2c43-928d-4c36-b680-5536726039ce', 'Hunter', 'Evans', 'hunter.e@outlook.com', '(602) 555-0478', 'Phoenix, AZ', NOW() - INTERVAL '8 days'),
('c0c1144c-c684-4c18-a67e-0a6c758635c2', '40e821b0-84e7-4b26-8961-6cb946c30817', 'a4595203-d309-4878-b96a-3ca69901c479', 'bacdabd5-46e2-464d-baf3-ca1c8aeb30ae', 'Ian', 'Edwards', 'ian.e@gmail.com', '(310) 555-0489', 'Los Angeles, CA', NOW() - INTERVAL '9 days'),
('c0c1144c-c684-4c18-a67e-0a6c758635c2', '40e821b0-84e7-4b26-8961-6cb946c30817', 'a4595203-d309-4878-b96a-3ca69901c479', 'bacdabd5-46e2-464d-baf3-ca1c8aeb30ae', 'Jack', 'Collins', 'jack.c@yahoo.com', '(212) 555-0490', 'New York, NY', NOW() - INTERVAL '10 days'),
('c0c1144c-c684-4c18-a67e-0a6c758635c2', '40e821b0-84e7-4b26-8961-6cb946c30817', 'f3c8b0cf-b7c0-4a2d-bcc4-2454498f06ad', '6d141f12-8a21-4117-ad5a-eeff2c9c05d5', 'Kyle', 'Stewart', 'kyle.s@gmail.com', '(469) 555-0501', 'Dallas, TX', NOW() - INTERVAL '11 days'),
('c0c1144c-c684-4c18-a67e-0a6c758635c2', '40e821b0-84e7-4b26-8961-6cb946c30817', '77ab120b-dc02-4a99-b4d2-f75f2fc5c598', '7a380003-809c-441f-9715-8cb0372f72e9', 'Leo', 'Sanchez', 'leo.s@icloud.com', '(832) 555-0512', 'Houston, TX', NOW() - INTERVAL '12 days'),

-- ============================================
-- PROMO ENTRIES (Tap It Tuesday - 8 entries)
-- ============================================

INSERT INTO promo_entries (promo_id, brand_id, qr_code_id, product_id, first_name, last_name, email, phone, city, entered_at) VALUES
('73454006-440d-4515-bd03-fc95e8ecf7af', '40e821b0-84e7-4b26-8961-6cb946c30817', 'f3c8b0cf-b7c0-4a2d-bcc4-2454498f06ad', '6d141f12-8a21-4117-ad5a-eeff2c9c05d5', 'Mason', 'Reed', 'mason.r@gmail.com', '(713) 555-0601', 'Houston, TX', NOW() - INTERVAL '14 days'),
('73454006-440d-4515-bd03-fc95e8ecf7af', '40e821b0-84e7-4b26-8961-6cb946c30817', '77ab120b-dc02-4a99-b4d2-f75f2fc5c598', '7a380003-809c-441f-9715-8cb0372f72e9', 'Noah', 'Cook', 'noah.c@outlook.com', '(512) 555-0612', 'Austin, TX', NOW() - INTERVAL '14 days'),
('73454006-440d-4515-bd03-fc95e8ecf7af', '40e821b0-84e7-4b26-8961-6cb946c30817', '11b6b9b3-f462-4f11-89b5-5b591008dad2', '07332f55-a8ef-4f2a-971e-1cbf9d2de7c8', 'Owen', 'Morgan', 'owen.m@gmail.com', '(404) 555-0623', 'Atlanta, GA', NOW() - INTERVAL '14 days'),
('73454006-440d-4515-bd03-fc95e8ecf7af', '40e821b0-84e7-4b26-8961-6cb946c30817', 'c15caeb0-f4a5-4658-98de-16a017943e52', 'de3a2c43-928d-4c36-b680-5536726039ce', 'Parker', 'Bell', 'parker.b@yahoo.com', '(305) 555-0634', 'Miami, FL', NOW() - INTERVAL '14 days'),
('73454006-440d-4515-bd03-fc95e8ecf7af', '40e821b0-84e7-4b26-8961-6cb946c30817', 'a4595203-d309-4878-b96a-3ca69901c479', 'bacdabd5-46e2-464d-baf3-ca1c8aeb30ae', 'Quinn', 'Murphy', 'quinn.m@icloud.com', '(214) 555-0645', 'Dallas, TX', NOW() - INTERVAL '14 days'),
('73454006-440d-4515-bd03-fc95e8ecf7af', '40e821b0-84e7-4b26-8961-6cb946c30817', 'f3c8b0cf-b7c0-4a2d-bcc4-2454498f06ad', '6d141f12-8a21-4117-ad5a-eeff2c9c05d5', 'Reed', 'Rivera', 'reed.r@gmail.com', '(469) 555-0656', 'Dallas, TX', NOW() - INTERVAL '21 days'),
('73454006-440d-4515-bd03-fc95e8ecf7af', '40e821b0-84e7-4b26-8961-6cb946c30817', '77ab120b-dc02-4a99-b4d2-f75f2fc5c598', '7a380003-809c-441f-9715-8cb0372f72e9', 'Sean', 'Cox', 'sean.c@outlook.com', '(832) 555-0667', 'Houston, TX', NOW() - INTERVAL '21 days'),
('73454006-440d-4515-bd03-fc95e8ecf7af', '40e821b0-84e7-4b26-8961-6cb946c30817', '11b6b9b3-f462-4f11-89b5-5b591008dad2', '07332f55-a8ef-4f2a-971e-1cbf9d2de7c8', 'Tristan', 'Diaz', 'tristan.d@gmail.com', '(615) 555-0678', 'Nashville, TN', NOW() - INTERVAL '21 days');
