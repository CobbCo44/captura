# Consent Handoff Verification Report

## How the write path works (the simple version)

```
Consumer scans QR
       ↓
Fills out form (promo, VIP, warranty, event, or loyalty)
       ↓
┌──────────────────────────────────────────────────┐
│  ScanPage.jsx  (runs in the consumer's browser)  │
│                                                  │
│  1. Saves entry to Supabase (our database)       │
│  2. Upserts a contact record in Supabase         │
│  3. Calls syncToShopify() →                      │
└──────────────┬───────────────────────────────────┘
               ↓
┌──────────────────────────────────────────────────┐
│  sync-shopify-customer.js  (Netlify function)    │
│                                                  │
│  - Looks up Shopify credentials from Supabase    │
│  - Searches for existing customer (email, phone) │
│  - Creates or updates the Shopify customer       │
│  - Sets tags, notes, metafields, consent         │
└──────────────┬───────────────────────────────────┘
               ↓
┌──────────────────────────────────────────────────┐
│  Shopify Customer Record                         │
│  (in the brand's Shopify store)                  │
│                                                  │
│  Fields set: name, email, phone (E.164),         │
│  tags, note, metafields, consent objects          │
└──────────────┬───────────────────────────────────┘
               ↓
┌──────────────────────────────────────────────────┐
│  Klaviyo  (syncs from Shopify automatically)     │
│                                                  │
│  Picks up: customer profile, tags as properties, │
│  email consent, SMS consent (if toggle is ON)    │
└──────────────────────────────────────────────────┘
```

---

## What was correct before this audit

- **Customer dedup**: The function searches by email first, then phone, before creating. If a create fails with a 422 "already taken" error, it retries as an update. No duplicates.
- **Tag merge on update**: When updating an existing customer, old tags are fetched and merged with new ones using a Set (no duplicates, no wipes).
- **Phone normalization for US numbers**: "(760) 555-1234" and "760-555-1234" both correctly become "+17605551234" (valid E.164).
- **Note append**: On update, the new note is appended below a `---` separator instead of overwriting the old one.
- **Supabase consent is correct**: The `get_or_create_contact` function uses `CASE WHEN EXCLUDED.sms_consent THEN TRUE ELSE contacts.sms_consent END`, meaning it can upgrade consent but never downgrade it. Good.
- **TCPA consent text is logged**: Promo and event entries store the exact consent language shown, timestamp, and IP in Supabase. This is evidence you'd need if challenged.

---

## What was broken (FIXED)

### BUG 1 (CRITICAL, TCPA) — Consent always set to "subscribed"

**What was wrong:** `sync-shopify-customer.js` hardcoded both `email_marketing_consent` and `sms_marketing_consent` to `state: 'subscribed'` whenever the customer had an email or phone. The marketing consent checkbox value was never passed from the form to the Shopify function. Every single consumer who entered their phone number was marked as SMS-opted-in in Shopify, even if they never checked the box.

**Why this matters:** Under TCPA, sending marketing texts to someone who didn't consent can result in $500-$1,500 per message in statutory damages. Klaviyo syncs SMS consent from Shopify. If the brand sends a text blast, they'd be texting people who never agreed.

**What I fixed:**
- `ScanPage.jsx`: Each `syncToShopify()` call now passes `marketingConsent: true/false` based on the actual checkbox value.
- `sync-shopify-customer.js`: Consent objects are only included when `marketingConsent` is `true`. When false, the fields are omitted entirely (Shopify treats absent fields as "no change" on update, "not subscribed" on create).

### BUG 2 (CRITICAL, TCPA) — Updates could overwrite opt-outs

**What was wrong:** When updating an existing customer, the consent fields were always sent as `state: 'subscribed'`. If a customer had previously opted OUT (via Shopify admin, Klaviyo, or a STOP reply), a new QR scan would silently re-subscribe them.

**What I fixed:** Same fix as Bug 1. Consent is only sent when `marketingConsent: true`, so a scan without the box checked can never flip an existing opt-out back to subscribed.

---

## Known gaps (not fixed, flagged for your awareness)

### GAP 1 — Short phone numbers become invalid E.164

If someone enters "555-1234" (7 digits, no area code), the code strips non-digits to get "5551234", and since it's not 10 or 11 digits, it becomes "+5551234". That's not a valid phone number. Shopify may reject it or store garbage.

**Suggested fix:** Reject phone numbers that don't have at least 10 digits after stripping. Show a form validation error.

### GAP 2 — No international phone support

The normalization assumes US numbers (prepends "1" for 10-digit inputs). A UK number like "+44 7911 123456" would lose the + and get "1" prepended incorrectly.

**Suggested fix:** If you ever need international: accept the `+` prefix and only prepend "1" when the number is exactly 10 digits with no leading `+`.

### GAP 3 — StorefrontScanPage never syncs to Shopify

`StorefrontScanPage.jsx` (the storefront/restaurant QR page) has its own promo form, but it only saves to Supabase. It never calls `syncToShopify()`. Storefront promo entries will not appear in the brand's Shopify customer list or Klaviyo.

**Suggested fix:** Add a `syncToShopify()` call in `handlePromoSubmit` in `StorefrontScanPage.jsx`, mirroring how `ScanPage.jsx` does it.

### GAP 4 — Tags missing SKU and location

The brief mentions tags for SKU and location. Currently the code tags: `captura`, form type (vip/promo/warranty/event/loyalty), channel name, product name, `serial:XXX`, and `gtin:XXX`. SKU and scan location (city) are stored in metafields and notes but not as tags.

**Impact:** Low. Metafields and notes are searchable. Tags are mainly for quick filtering, and adding too many tag types could approach the 250-tag limit on heavy repeat scanners.

### GAP 5 — Loyalty signup has no consent checkbox

The loyalty signup form in ScanPage.jsx collects name, email, and phone but has no marketing consent checkbox. The `syncToShopify` call passes `marketingConsent: false`, so consent is correctly NOT set. But if you want loyalty members to be marketable, you'd need to add a checkbox.

---

## Files changed

| File | Change |
|------|--------|
| `netlify/functions/sync-shopify-customer.js` | Only set consent when `marketingConsent: true` |
| `src/pages/ScanPage.jsx` | Pass `marketingConsent` flag in all 5 `syncToShopify()` calls |

---

## How to run the verification test

```bash
cd ~/Desktop/Captura

# Set your dev store credentials (never use production)
export SHOPIFY_STORE=your-dev-store
export SHOPIFY_TOKEN=shpat_your_token_here

# Optional: also verify Klaviyo
export KLAVIYO_API_KEY=pk_your_key_here

# Run
node scripts/verify-consent-handoff.js
```

The script creates test customers with `test+*@meetcaptura.com` emails, checks consent fields, then cleans up after itself. It prints a PASS/FAIL table at the end.

Required Shopify API scopes: `read_customers`, `write_customers`.

If you don't have a Klaviyo API key, see `docs/klaviyo-manual-check.md` for step-by-step instructions to verify in the Klaviyo UI.
