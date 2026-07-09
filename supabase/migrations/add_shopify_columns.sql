-- Add Shopify integration columns to brands table
ALTER TABLE brands ADD COLUMN IF NOT EXISTS shopify_store TEXT;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS shopify_token TEXT;

-- Add Shopify product ID to products table for dedup on import
ALTER TABLE products ADD COLUMN IF NOT EXISTS shopify_product_id TEXT;
