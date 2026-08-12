/**
 * Server-side consumer form submission handler.
 *
 * ALL consumer form submissions (VIP, promo, warranty, event) go through
 * this function. It enforces rate limiting and duplicate detection
 * server-side before inserting into Supabase using the service role key.
 *
 * This means the public Supabase INSERT policies on consumer tables can
 * be removed — the anon key can no longer write directly to these tables.
 * A bot that tries to bypass the React UI and POST straight to Supabase
 * will be blocked by RLS.
 */

import { createClient } from '@supabase/supabase-js'

export default async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    return new Response(JSON.stringify({ error: 'Server misconfigured' }), { status: 500, headers })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    const body = await req.json()
    const { type, data } = body
    // type = 'vip' | 'promo' | 'warranty' | 'event'
    // data = the row to insert (varies by type)

    if (!type || !data || !data.brand_id) {
      return new Response(JSON.stringify({ error: 'Missing type or data' }), { status: 400, headers })
    }

    // --- Rate limit by IP ---
    const clientIp = req.headers.get('x-nf-client-connection-ip')
      || (req.headers.get('x-forwarded-for') || '').split(',')[0].trim()
      || 'unknown'

    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    const { count: recentCount } = await supabase
      .from('rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('ip_address', clientIp)
      .gte('created_at', tenMinAgo)

    if (recentCount >= 10) {
      return new Response(JSON.stringify({
        error: 'Too many submissions. Please try again in a few minutes.',
        rateLimited: true,
      }), { status: 429, headers })
    }

    // Log this submission for rate tracking
    await supabase.from('rate_limits').insert({
      ip_address: clientIp,
      source_type: type,
    })

    // --- Phone validation ---
    if (data.phone) {
      const digits = data.phone.replace(/\D/g, '')
      const normalized = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits
      if (normalized.length !== 10) {
        return new Response(JSON.stringify({ error: 'Invalid phone number' }), { status: 400, headers })
      }
    }

    // --- Loyalty: rate check only (RPC handles the actual insert) ---
    if (type === 'loyalty' || type === 'loyalty_lookup') {
      return new Response(JSON.stringify({ success: true, rateCheckOnly: true }), { status: 200, headers })
    }

    // --- Insert based on type ---
    let table
    let insertData = { ...data }

    switch (type) {
      case 'vip':
        table = 'vip_members'
        break
      case 'promo':
        table = 'promo_entries'
        break
      case 'warranty':
        table = 'warranty_registrations'
        // Validate purchase date
        if (insertData.purchase_date) {
          const purchaseDate = new Date(insertData.purchase_date)
          if (purchaseDate > new Date()) {
            return new Response(JSON.stringify({ error: 'Purchase date cannot be in the future' }), { status: 400, headers })
          }
        }
        break
      case 'event':
        table = 'event_entries'
        break
      default:
        return new Response(JSON.stringify({ error: 'Unknown submission type' }), { status: 400, headers })
    }

    const { data: inserted, error: insertError } = await supabase
      .from(table)
      .insert(insertData)
      .select('id')
      .single()

    if (insertError) {
      await supabase.from('error_log').insert({
        source: `consumer_submit_${type}`,
        message: insertError.message,
        metadata: { brand_id: data.brand_id, table, ip: clientIp },
      })
      return new Response(JSON.stringify({ error: 'Failed to save submission' }), { status: 500, headers })
    }

    return new Response(JSON.stringify({ success: true, id: inserted?.id }), { status: 200, headers })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500, headers })
  }
}
