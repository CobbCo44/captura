-- Add GTIN (Global Trade Item Number) column to products table.
-- Nullable so existing products keep working.
-- When populated (manually or from Shopify barcode), enables GS1 Digital Link QR codes.

ALTER TABLE products ADD COLUMN IF NOT EXISTS gtin TEXT;

CREATE INDEX IF NOT EXISTS idx_products_gtin ON products(gtin);
