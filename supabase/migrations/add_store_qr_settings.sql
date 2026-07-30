-- Store QR customization columns on the brands table
ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS store_qr_fg_color TEXT DEFAULT '#18181B',
  ADD COLUMN IF NOT EXISTS store_qr_bg_color TEXT DEFAULT '#FFFFFF',
  ADD COLUMN IF NOT EXISTS store_qr_logo_url TEXT,
  ADD COLUMN IF NOT EXISTS store_qr_logo_scale REAL DEFAULT 0.25,
  ADD COLUMN IF NOT EXISTS store_qr_cta_text TEXT;
