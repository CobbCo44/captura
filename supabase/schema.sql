-- Captura Database Schema
-- Run this in Supabase SQL Editor

-- Brands (each brand account)
CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  logo_url TEXT,
  shopify_store TEXT,
  shopify_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  sku TEXT,
  description TEXT,
  content_title TEXT,
  content_body TEXT,
  content_url TEXT,
  image_url TEXT,
  shopify_product_id TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- QR Codes
CREATE TABLE qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  short_id TEXT UNIQUE NOT NULL,
  fg_color TEXT DEFAULT '#18181B',
  bg_color TEXT DEFAULT '#FFFFFF',
  logo_url TEXT,
  logo_scale REAL DEFAULT 0.25,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scans (every time someone scans a QR code)
CREATE TABLE scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code_id UUID REFERENCES qr_codes(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE NOT NULL,
  latitude REAL,
  longitude REAL,
  city TEXT,
  region TEXT,
  country TEXT,
  device TEXT,
  user_agent TEXT,
  scanned_at TIMESTAMPTZ DEFAULT NOW()
);

-- VIP Members (consumers who sign up)
CREATE TABLE vip_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE NOT NULL,
  qr_code_id UUID REFERENCES qr_codes(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  latitude REAL,
  longitude REAL,
  city TEXT,
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX idx_scans_brand ON scans(brand_id);
CREATE INDEX idx_scans_product ON scans(product_id);
CREATE INDEX idx_scans_qr ON scans(qr_code_id);
CREATE INDEX idx_scans_time ON scans(scanned_at DESC);
CREATE INDEX idx_vip_brand ON vip_members(brand_id);
CREATE INDEX idx_qr_short ON qr_codes(short_id);
CREATE INDEX idx_products_brand ON products(brand_id);

-- Row Level Security
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE vip_members ENABLE ROW LEVEL SECURITY;

-- Brands: users can only see their own brand
CREATE POLICY "Users see own brand" ON brands
  FOR ALL USING (user_id = auth.uid());

-- Products: users can manage products for their brand
CREATE POLICY "Users manage own products" ON products
  FOR ALL USING (brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid()));

-- QR Codes: users can manage QR codes for their brand
CREATE POLICY "Users manage own qr_codes" ON qr_codes
  FOR ALL USING (brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid()));

-- Scans: users can view scans for their brand
CREATE POLICY "Users view own scans" ON scans
  FOR SELECT USING (brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid()));

-- Scans: anyone can INSERT (public scan endpoint)
CREATE POLICY "Anyone can create scan" ON scans
  FOR INSERT WITH CHECK (true);

-- VIP Members: users can view members for their brand
CREATE POLICY "Users view own vip_members" ON vip_members
  FOR SELECT USING (brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid()));

-- VIP Members: anyone can INSERT (public signup)
CREATE POLICY "Anyone can join vip" ON vip_members
  FOR INSERT WITH CHECK (true);

-- QR Codes: anyone can SELECT (needed for scan page lookup)
CREATE POLICY "Anyone can read qr_codes" ON qr_codes
  FOR SELECT USING (true);

-- Products: anyone can SELECT (needed for scan page)
CREATE POLICY "Anyone can read products" ON products
  FOR SELECT USING (true);
