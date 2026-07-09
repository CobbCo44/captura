-- Migration: Add promo-only QR codes (event/activation QR codes not tied to a product)
-- Run this in Supabase SQL Editor

-- 1. Make product_id nullable on qr_codes (so QR codes can exist without a product)
ALTER TABLE qr_codes ALTER COLUMN product_id DROP NOT NULL;

-- 2. Add promo_id to qr_codes (link a QR code directly to a promo)
ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS promo_id UUID REFERENCES promos(id) ON DELETE SET NULL;

-- 3. Add cta_text to qr_codes if it doesn't exist
ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS cta_text TEXT;

-- 4. Make product_id nullable on scans (promo QR scans won't have a product)
ALTER TABLE scans ALTER COLUMN product_id DROP NOT NULL;

-- 5. Make product_id nullable on promo_entries (event entries won't have a product)
ALTER TABLE promo_entries ALTER COLUMN product_id DROP NOT NULL;

-- 6. Index for fast promo QR lookups
CREATE INDEX IF NOT EXISTS idx_qr_promo ON qr_codes(promo_id);
