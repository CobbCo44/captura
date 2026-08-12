/**
 * Server-side admin data loader.
 *
 * Verifies the requesting user is in the admin allowlist,
 * then returns all brands/scans/consumers using the service role key.
 * This ensures admin access is enforced server-side, not just in React.
 */

import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || process.env.VITE_ADMIN_EMAILS || '')
  .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
    return new Response(JSON.stringify({ error: 'Server misconfigured' }), { status: 500, headers })
  }

  try {
    const { accessToken } = await req.json()
    if (!accessToken) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401, headers })
    }

    // Verify the user's JWT to get their email
    const anonClient = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { user }, error: authError } = await anonClient.auth.getUser(accessToken)

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), { status: 401, headers })
    }

    const email = (user.email || '').toLowerCase()
    if (ADMIN_EMAILS.length === 0 || !ADMIN_EMAILS.includes(email)) {
      return new Response(JSON.stringify({ error: 'Access denied' }), { status: 403, headers })
    }

    // User is verified admin — query with service role key (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const [brandsRes, scansRes, vipRes, promoRes, eventRes, billingRes] = await Promise.all([
      supabase.from('brands').select('*').order('created_at', { ascending: false }),
      supabase.from('scans').select('*, products(name, sku), brands:brand_id(name, industry)').order('scanned_at', { ascending: false }).limit(5000),
      supabase.from('vip_members').select('*, products(name), brands:brand_id(name, industry)').order('joined_at', { ascending: false }),
      supabase.from('promo_entries').select('*, products(name), brands:brand_id(name, industry)').order('entered_at', { ascending: false }),
      supabase.from('event_entries').select('*, events(name), brands:brand_id(name, industry)').order('entered_at', { ascending: false }),
      supabase.from('billing_events').select('*, brands:brand_id(name, industry)').order('created_at', { ascending: false }),
    ])

    return new Response(JSON.stringify({
      brands: brandsRes.data || [],
      scans: scansRes.data || [],
      vipMembers: vipRes.data || [],
      promoEntries: promoRes.data || [],
      eventEntries: eventRes.data || [],
      billingEvents: billingRes.data || [],
    }), { status: 200, headers })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500, headers })
  }
}
