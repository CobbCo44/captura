-- 1. Products: care_url
ALTER TABLE products ADD COLUMN IF NOT EXISTS care_url TEXT;

-- 2. Visitors
CREATE TABLE IF NOT EXISTS visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE NOT NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert visitors" ON visitors FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update visitors" ON visitors FOR UPDATE USING (true);
CREATE POLICY "Brand owners read visitors" ON visitors
  FOR SELECT USING (brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid()));

-- 3. Contacts (the spine)
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE NOT NULL,
  visitor_id UUID REFERENCES visitors(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  sms_consent BOOLEAN NOT NULL DEFAULT FALSE,
  sms_consent_at TIMESTAMPTZ,
  sms_consent_text TEXT,
  source TEXT CHECK (source IN ('promo', 'warranty', 'vip')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (brand_id, email)
);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert contacts" ON contacts FOR INSERT WITH CHECK (true);
CREATE POLICY "Brand owners read contacts" ON contacts
  FOR SELECT USING (brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid()));

-- 4. Promo entries (hangs off contact)
CREATE TABLE IF NOT EXISTS contact_promo_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  promo_id UUID REFERENCES promos(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (contact_id, promo_id)
);

ALTER TABLE contact_promo_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert contact_promo_entries" ON contact_promo_entries
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Brand owners read contact_promo_entries" ON contact_promo_entries
  FOR SELECT USING (
    contact_id IN (SELECT id FROM contacts WHERE brand_id IN
      (SELECT id FROM brands WHERE user_id = auth.uid()))
  );

-- 5. Warranties (hangs off contact)
CREATE TABLE IF NOT EXISTS contact_warranties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  purchase_date DATE,
  retailer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (contact_id, product_id)
);

ALTER TABLE contact_warranties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert contact_warranties" ON contact_warranties
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Brand owners read contact_warranties" ON contact_warranties
  FOR SELECT USING (
    contact_id IN (SELECT id FROM contacts WHERE brand_id IN
      (SELECT id FROM brands WHERE user_id = auth.uid()))
  );

-- 6. RPC for visitor.captured check (returns boolean, nothing else)
CREATE OR REPLACE FUNCTION is_visitor_captured(p_visitor_id UUID, p_brand_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM contacts
    WHERE visitor_id = p_visitor_id AND brand_id = p_brand_id
  );
$$;
