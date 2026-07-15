-- Make qr_code_id nullable on scans table.
-- Serialized QR scans (/01/GTIN/21/SERIAL) may not have a static QR code,
-- so qr_code_id must allow NULL to avoid silently dropping scan records.

ALTER TABLE scans ALTER COLUMN qr_code_id DROP NOT NULL;

-- Change ON DELETE behavior from CASCADE to SET NULL so deleting a QR code
-- doesn't wipe scan history.
ALTER TABLE scans DROP CONSTRAINT IF EXISTS scans_qr_code_id_fkey;
ALTER TABLE scans ADD CONSTRAINT scans_qr_code_id_fkey
  FOREIGN KEY (qr_code_id) REFERENCES qr_codes(id) ON DELETE SET NULL;
