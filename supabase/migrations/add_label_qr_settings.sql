-- Label QR customization columns on the brands table
ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS label_qr_fg_color TEXT DEFAULT '#18181B',
  ADD COLUMN IF NOT EXISTS label_qr_bg_color TEXT DEFAULT '#FFFFFF',
  ADD COLUMN IF NOT EXISTS label_qr_logo_url TEXT,
  ADD COLUMN IF NOT EXISTS label_qr_logo_scale REAL DEFAULT 0.25,
  ADD COLUMN IF NOT EXISTS label_qr_cta_text TEXT;
