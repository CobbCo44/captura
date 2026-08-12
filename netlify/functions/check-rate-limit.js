/**
 * Server-side rate limiter for consumer form submissions.
 *
 * Prevents bots from spamming VIP signups, promo entries, warranty
 * registrations, and event entries. Checks by IP address: max 10
 * submissions per IP per 10-minute window.
 *
 * Also checks for duplicate submissions: same email + brand + source
 * type within 24 hours returns a duplicate flag (but doesn't block,
 * so the client can show a friendly message).
 */

import { createClient } from '@supabase/supabase-js'

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { ...headers, 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type' } })
  }

  try {
    const { brandId, email, phone, sourceType } = await req.json()

    const clientIp = req.headers.get('x-nf-client-connection-ip')
      || (req.headers.get('x-forwarded-for') || '').split(',')[0].trim()
      || 'unknown'

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseKey) {
      // If no DB, allow but can't check
      return new Response(JSON.stringify({ allowed: true, duplicate: false }), { status: 200, headers })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // --- Rate limit by IP ---
    // Count recent submissions from this IP in the last 10 minutes
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    const { count: recentCount } = await supabase
      .from('rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('ip_address', clientIp)
      .gte('created_at', tenMinAgo)

    if (recentCount >= 10) {
      return new Response(JSON.stringify({
        allowed: false,
        duplicate: false,
        reason: 'Too many submissions. Please try again in a few minutes.',
      }), { status: 429, headers })
    }

    // Log this attempt
    await supabase.from('rate_limits').insert({
      ip_address: clientIp,
      source_type: sourceType || 'unknown',
    })

    // --- Duplicate check ---
    let duplicate = false
    if (brandId && (email || phone)) {
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const consumerKey = (email || phone || '').trim().toLowerCase()

      const { count: dupCount } = await supabase
        .from('billing_events')
        .select('*', { count: 'exact', head: true })
        .eq('brand_id', brandId)
        .eq('consumer_key', consumerKey)
        .eq('source_type', sourceType)
        .gte('created_at', dayAgo)

      duplicate = dupCount > 0
    }

    return new Response(JSON.stringify({ allowed: true, duplicate }), { status: 200, headers })
  } catch (err) {
    // On error, allow submission (fail open) but log
    return new Response(JSON.stringify({ allowed: true, duplicate: false }), { status: 200, headers })
  }
}
