-- 1. Promos: temporal fields for derived status
ALTER TABLE promos ADD COLUMN IF NOT EXISTS start_at TIMESTAMPTZ;
ALTER TABLE promos ADD COLUMN IF NOT EXISTS end_at TIMESTAMPTZ;
ALTER TABLE promos ADD COLUMN IF NOT EXISTS winner_name TEXT;
ALTER TABLE promos ADD COLUMN IF NOT EXISTS winner_city TEXT;
ALTER TABLE promos ADD COLUMN IF NOT EXISTS winner_announced_at TIMESTAMPTZ;

-- Backfill existing promos
UPDATE promos SET start_at = created_at WHERE start_at IS NULL;
UPDATE promos SET end_at = created_at + INTERVAL '7 days' WHERE end_at IS NULL;

-- Enforce NOT NULL + window constraint
ALTER TABLE promos ALTER COLUMN start_at SET NOT NULL;
ALTER TABLE promos ALTER COLUMN end_at SET NOT NULL;
ALTER TABLE promos ADD CONSTRAINT promo_window_check CHECK (end_at > start_at);

-- 2. Products: product type + features
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type TEXT DEFAULT 'durable';
ALTER TABLE products ADD CONSTRAINT product_type_check CHECK (product_type IN ('durable', 'consumable'));
ALTER TABLE products ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '[]'::jsonb;
