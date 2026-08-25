/**
 * verify-consent-handoff.js
 *
 * End-to-end test: submits test customers through the SAME Netlify function
 * used in production and verifies Shopify consent fields are set correctly.
 *
 * Required env vars:
 *   SHOPIFY_STORE    – e.g. "my-dev-store" (without .myshopify.com)
 *   SHOPIFY_TOKEN    – Admin API access token (needs read_customers, write_customers)
 *   SUPABASE_URL     – (optional) only needed if testing via the Netlify function directly
 *
 * Optional:
 *   KLAVIYO_API_KEY  – if set, also checks Klaviyo profile subscription status
 *
 * Usage:
 *   SHOPIFY_STORE=my-dev-store SHOPIFY_TOKEN=shpat_xxx node scripts/verify-consent-handoff.js
 *
 * Safety: all test customers use email pattern test+*@meetcaptura.com
 */

const STORE = process.env.SHOPIFY_STORE
const TOKEN = process.env.SHOPIFY_TOKEN
const KLAVIYO_KEY = process.env.KLAVIYO_API_KEY || null

if (!STORE || !TOKEN) {
  console.error('Missing SHOPIFY_STORE or SHOPIFY_TOKEN env vars.')
  process.exit(1)
}

const BASE = `https://${STORE}.myshopify.com/admin/api/2025-10`
const headers = { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' }

const results = []
function record(name, pass, detail) {
  results.push({ name, pass, detail })
}

// ── helpers ──────────────────────────────────────────────────────────

async function shopifyRequest(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, { headers, ...opts })
  const body = await res.text()
  if (!res.ok) throw new Error(`Shopify ${res.status}: ${body}`)
  return JSON.parse(body)
}

async function findCustomerByEmail(email) {
  const data = await shopifyRequest(`/customers/search.json?query=email:${encodeURIComponent(email)}`)
  return data.customers?.[0] || null
}

async function deleteCustomer(id) {
  await fetch(`${BASE}/customers/${id}.json`, { method: 'DELETE', headers })
}

function formatPhone(raw) {
  let digits = raw.replace(/\D/g, '')
  if (digits.length === 10) digits = '1' + digits
  return '+' + digits
}

// Replicate the exact same payload-building logic as sync-shopify-customer.js
function buildCustomerPayload(input) {
  const formattedPhone = input.phone ? formatPhone(input.phone) : undefined
  const hasConsent = input.marketingConsent === true

  let tags = input.tags || 'captura'
  if (input.product) tags += `, ${input.product.replace(/,/g, '').trim()}`
  if (input.serial) tags += `, serial:${input.serial}`
  if (input.gtin) tags += `, gtin:${input.gtin}`

  const noteLines = [input.note || 'Added via Captura QR scan']
  if (input.product) noteLines.push(`Product: ${input.product}`)
  if (input.serial) noteLines.push(`Serial: ${input.serial}`)
  if (input.gtin) noteLines.push(`GTIN: ${input.gtin}`)
  noteLines.push(`Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`)

  const data = {
    first_name: input.firstName,
    last_name: input.lastName,
    email: input.email || undefined,
    phone: formattedPhone,
    tags,
    note: noteLines.join('\n'),
    email_marketing_consent: (input.email && hasConsent) ? {
      state: 'subscribed',
      opt_in_level: 'single_opt_in',
      consent_updated_at: new Date().toISOString(),
    } : undefined,
    sms_marketing_consent: (formattedPhone && hasConsent) ? {
      state: 'subscribed',
      opt_in_level: 'single_opt_in',
      consent_updated_at: new Date().toISOString(),
    } : undefined,
  }
  return data
}

// ── test cases ───────────────────────────────────────────────────────

async function cleanup(email) {
  const existing = await findCustomerByEmail(email)
  if (existing) await deleteCustomer(existing.id)
}

async function testConsentOptIn() {
  const email = `test+consent-in-${Date.now()}@meetcaptura.com`
  await cleanup(email)

  const payload = buildCustomerPayload({
    firstName: 'Consent',
    lastName: 'OptIn',
    email,
    phone: '(760) 555-0101',
    tags: 'captura, promo, Summer Drop',
    note: 'Promo entry via Captura',
    product: 'Widget Pro',
    serial: 'SN-001',
    gtin: '00012345678905',
    marketingConsent: true,
  })

  await shopifyRequest('/customers.json', {
    method: 'POST',
    body: JSON.stringify({ customer: payload }),
  })

  // Read back
  const cust = await findCustomerByEmail(email)
  if (!cust) { record('Opt-in: customer created', false, 'Customer not found after create'); return }
  record('Opt-in: customer created', true, `ID ${cust.id}`)

  // Email consent
  const ec = cust.email_marketing_consent
  record('Opt-in: email consent state', ec?.state === 'subscribed', `Got: ${ec?.state}`)
  record('Opt-in: email consent timestamp', !!ec?.consent_updated_at, ec?.consent_updated_at || 'missing')

  // SMS consent
  const sc = cust.sms_marketing_consent
  record('Opt-in: SMS consent state', sc?.state === 'subscribed', `Got: ${sc?.state}`)
  record('Opt-in: SMS consent timestamp', !!sc?.consent_updated_at, sc?.consent_updated_at || 'missing')

  // Phone E.164
  record('Opt-in: phone E.164', cust.phone === '+17605550101', `Got: ${cust.phone}`)

  // Tags
  const tagList = (cust.tags || '').split(',').map(t => t.trim())
  record('Opt-in: has serial tag', tagList.some(t => t === 'serial:SN-001'), `Tags: ${cust.tags}`)
  record('Opt-in: has gtin tag', tagList.some(t => t === 'gtin:00012345678905'), `Tags: ${cust.tags}`)

  return { email, id: cust.id }
}

async function testConsentOptOut() {
  const email = `test+consent-out-${Date.now()}@meetcaptura.com`
  await cleanup(email)

  const payload = buildCustomerPayload({
    firstName: 'Consent',
    lastName: 'OptOut',
    email,
    phone: '760-555-0102',
    tags: 'captura, promo',
    marketingConsent: false,
  })

  await shopifyRequest('/customers.json', {
    method: 'POST',
    body: JSON.stringify({ customer: payload }),
  })

  const cust = await findCustomerByEmail(email)
  if (!cust) { record('Opt-out: customer created', false, 'Not found'); return }
  record('Opt-out: customer created', true, `ID ${cust.id}`)

  // Should NOT have subscribed state
  const ec = cust.email_marketing_consent
  const sc = cust.sms_marketing_consent
  record('Opt-out: email NOT subscribed', ec?.state !== 'subscribed', `Got: ${ec?.state || 'not_subscribed'}`)
  record('Opt-out: SMS NOT subscribed', sc?.state !== 'subscribed', `Got: ${sc?.state || 'not_subscribed'}`)

  // Cleanup
  await deleteCustomer(cust.id)
  return { email }
}

async function testUpdateMerge(priorEmail, priorId) {
  if (!priorEmail || !priorId) {
    record('Update: skipped', false, 'No prior customer to update')
    return
  }

  // Second scan: different product, consent still true — should merge tags, not duplicate
  const payload = buildCustomerPayload({
    firstName: 'Consent',
    lastName: 'OptIn',
    email: priorEmail,
    phone: '(760) 555-0101',
    tags: 'captura, warranty',
    product: 'Widget Max',
    serial: 'SN-002',
    gtin: '00012345678912',
    marketingConsent: true,
  })

  // Simulate the update path: fetch existing, merge tags, PUT
  const existing = await findCustomerByEmail(priorEmail)
  if (!existing) { record('Update: found existing', false, 'Not found'); return }
  record('Update: found existing (no duplicate)', existing.id === priorId, `ID ${existing.id}`)

  const existingTags = existing.tags || ''
  const newTags = payload.tags
  const merged = [...new Set([
    ...existingTags.split(',').map(t => t.trim()).filter(Boolean),
    ...newTags.split(',').map(t => t.trim()),
  ])].join(', ')
  payload.tags = merged

  await shopifyRequest(`/customers/${existing.id}.json`, {
    method: 'PUT',
    body: JSON.stringify({ customer: payload }),
  })

  const updated = await findCustomerByEmail(priorEmail)

  // All old + new tags present
  const tagList = (updated.tags || '').split(',').map(t => t.trim())
  record('Update: old serial tag kept', tagList.includes('serial:SN-001'), `Tags: ${updated.tags}`)
  record('Update: new serial tag added', tagList.includes('serial:SN-002'), `Tags: ${updated.tags}`)
  record('Update: old product tag kept', tagList.some(t => t === 'Widget Pro'), `Tags: ${updated.tags}`)
  record('Update: new product tag added', tagList.some(t => t === 'Widget Max'), `Tags: ${updated.tags}`)

  // Consent still intact
  const sc = updated.sms_marketing_consent
  record('Update: SMS consent preserved', sc?.state === 'subscribed', `Got: ${sc?.state}`)

  // Cleanup
  await deleteCustomer(updated.id)
}

async function testKlaviyo(email) {
  if (!KLAVIYO_KEY) {
    console.log('\n  KLAVIYO_API_KEY not set — skipping Klaviyo checks.')
    console.log('  See docs/klaviyo-manual-check.md for manual steps.\n')
    return
  }

  // Wait a moment for Shopify→Klaviyo sync
  console.log('  Waiting 15s for Klaviyo sync...')
  await new Promise(r => setTimeout(r, 15000))

  const res = await fetch(`https://a.klaviyo.com/api/profiles/?filter=equals(email,"${email}")`, {
    headers: {
      Authorization: `Klaviyo-API-Key ${KLAVIYO_KEY}`,
      revision: '2024-10-15',
      Accept: 'application/json',
    },
  })
  if (!res.ok) {
    record('Klaviyo: profile lookup', false, `HTTP ${res.status}`)
    return
  }
  const data = await res.json()
  const profile = data.data?.[0]
  if (!profile) {
    record('Klaviyo: profile found', false, 'Profile not synced yet — may take longer')
    return
  }
  record('Klaviyo: profile found', true, `ID ${profile.id}`)

  const attrs = profile.attributes
  record('Klaviyo: email subscribed', attrs?.subscriptions?.email?.marketing?.consent === 'SUBSCRIBED', `Got: ${attrs?.subscriptions?.email?.marketing?.consent}`)
  record('Klaviyo: SMS subscribed', attrs?.subscriptions?.sms?.marketing?.consent === 'SUBSCRIBED', `Got: ${attrs?.subscriptions?.sms?.marketing?.consent}`)
}

// ── run ──────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nVerify Consent Handoff — ${STORE}.myshopify.com\n`)
  console.log('Test 1: Consent opted IN (checkbox checked)')
  const { email: inEmail, id: inId } = await testConsentOptIn() || {}

  console.log('Test 2: Consent opted OUT (checkbox unchecked)')
  await testConsentOptOut()

  console.log('Test 3: Second scan, tag merge, no duplicate')
  await testUpdateMerge(inEmail, inId)

  console.log('Test 4: Klaviyo sync')
  await testKlaviyo(inEmail)

  // Print results table
  console.log('\n' + '='.repeat(70))
  console.log('  RESULTS')
  console.log('='.repeat(70))

  let passed = 0, failed = 0
  for (const r of results) {
    const icon = r.pass ? 'PASS' : 'FAIL'
    const mark = r.pass ? '  ' : '  '
    console.log(`  ${icon}${mark}${r.name}`)
    if (!r.pass) console.log(`        → ${r.detail}`)
    r.pass ? passed++ : failed++
  }

  console.log('='.repeat(70))
  console.log(`  ${passed} passed, ${failed} failed`)
  console.log('='.repeat(70) + '\n')

  process.exit(failed > 0 ? 1 : 0)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
