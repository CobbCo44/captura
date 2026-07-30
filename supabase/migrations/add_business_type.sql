-- Add business_type column to brands (default to 'product' for existing brands)
ALTER TABLE brands ADD COLUMN IF NOT EXISTS business_type TEXT DEFAULT 'product' CHECK (business_type IN ('product', 'storefront'));
