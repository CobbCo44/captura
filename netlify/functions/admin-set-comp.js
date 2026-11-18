/**
 * Admin-only: give a brand a free plan, or take it away.
 * POST { accessToken, brand_id, comp_tier: 'starter' | 'growth' | 'pro' | null }
 * Same admin allowlist check as admin-data; writes with the service role,
 * which is the only role allowed to change billing columns.
 */

import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || process.env.VITE_ADMIN_EMAILS || '')
  .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)

const TIERS = ['starter', 'growth', 'pro']

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
    return new Response(JSON.stringify({ error: 'Server misconfigured' }), { status: 500, headers })
  }

  try {
    const { accessToken, brand_id, comp_tier } = await req.json()
    if (!accessToken) return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401, headers })
    if (!brand_id) return new Response(JSON.stringify({ error: 'Missing brand_id' }), { status: 400, headers })
    if (comp_tier !== null && !TIERS.includes(comp_tier)) {
      return new Response(JSON.stringify({ error: 'Unknown plan' }), { status: 400, headers })
    }

    const anonClient = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { user }, error: authError } = await anonClient.auth.getUser(accessToken)
    if (authError || !user) return new Response(JSON.stringify({ error: 'Invalid session' }), { status: 401, headers })
    if (ADMIN_EMAILS.length === 0 || !ADMIN_EMAILS.includes((user.email || '').toLowerCase())) {
      return new Response(JSON.stringify({ error: 'Access denied' }), { status: 403, headers })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { data, error } = await supabase.from('brands')
      .update({ comp_tier, billing_updated_at: new Date().toISOString() })
      .eq('id', brand_id)
      .select('id, name, comp_tier')
      .single()
    if (error) throw error

    return new Response(JSON.stringify({ brand: data }), { status: 200, headers })
  } catch (err) {
    console.error('admin-set-comp:', err.message)
    return new Response(JSON.stringify({ error: 'Could not update the plan.' }), { status: 500, headers })
  }
}
