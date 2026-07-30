-- Add header type and header logo to brands
ALTER TABLE brands ADD COLUMN IF NOT EXISTS store_header_type TEXT DEFAULT 'text' CHECK (store_header_type IN ('logo', 'text'));
ALTER TABLE brands ADD COLUMN IF NOT EXISTS store_header_logo TEXT;
