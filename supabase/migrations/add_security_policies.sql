-- Security fixes: Add RLS to tables missing it and add shopify_nonce column

-- Add shopify_nonce column for OAuth CSRF protection
ALTER TABLE brands ADD COLUMN IF NOT EXISTS shopify_nonce TEXT;

-- =============================================
-- PROMOS TABLE - Enable RLS and add policies
-- =============================================
ALTER TABLE promos ENABLE ROW LEVEL SECURITY;

-- Brand owners can manage their own promos
CREATE POLICY "Users manage own promos" ON promos
  FOR ALL USING (brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid()));

-- Anyone can read promos (needed for scan page)
CREATE POLICY "Anyone can read promos" ON promos
  FOR SELECT USING (true);

-- =============================================
-- PROMO_ENTRIES TABLE - Enable RLS and add policies
-- =============================================
ALTER TABLE promo_entries ENABLE ROW LEVEL SECURITY;

-- Brand owners can view entries for their promos
CREATE POLICY "Users view own promo_entries" ON promo_entries
  FOR SELECT USING (brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid()));

-- Anyone can submit a promo entry (public form)
CREATE POLICY "Anyone can submit promo entry" ON promo_entries
  FOR INSERT WITH CHECK (true);

-- =============================================
-- WARRANTY_REGISTRATIONS TABLE - Enable RLS and add policies
-- =============================================
ALTER TABLE warranty_registrations ENABLE ROW LEVEL SECURITY;

-- Brand owners can view warranty registrations for their brand
CREATE POLICY "Users view own warranty_registrations" ON warranty_registrations
  FOR SELECT USING (brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid()));

-- Anyone can submit a warranty registration (public form)
CREATE POLICY "Anyone can submit warranty registration" ON warranty_registrations
  FOR INSERT WITH CHECK (true);

-- =============================================
-- ADMINS TABLE - Enable RLS and add policies
-- =============================================
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Users can only check if they are an admin
CREATE POLICY "Users can check own admin status" ON admins
  FOR SELECT USING (user_id = auth.uid());

-- No public insert/update/delete on admins
-- Admin records must be managed via Supabase dashboard or service role
