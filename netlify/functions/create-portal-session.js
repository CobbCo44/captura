/**
 * Opens the Stripe Billing Portal so owners can change cards,
 * switch plans, download invoices, or cancel — all on Stripe's side.
 */

import { getStripe, getSupabase, authBrandOwner } from './lib/stripe-billing.js'

const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }

export default async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' } })
  }
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const supabase = getSupabase()
  if (!supabase) return new Response(JSON.stringify({ error: 'Server misconfigured' }), { status: 500, headers })

  const stripe = getStripe()
  if (!stripe) return new Response(JSON.stringify({ error: 'billing_not_configured' }), { status: 200, headers })

  try {
    const { brand_id } = await req.json()
    const auth = await authBrandOwner(supabase, req, brand_id)
    if (auth.error) return new Response(JSON.stringify({ error: auth.error }), { status: 401, headers })
    if (!auth.brand.stripe_customer_id) {
      return new Response(JSON.stringify({ error: 'No billing account yet. Pick a plan first.' }), { status: 400, headers })
    }

    const origin = process.env.URL || 'https://meetcaptura.com'
    const session = await stripe.billingPortal.sessions.create({
      customer: auth.brand.stripe_customer_id,
      return_url: `${origin}/dashboard/billing`,
    })
    return new Response(JSON.stringify({ url: session.url }), { status: 200, headers })
  } catch (err) {
    console.error('create-portal-session:', err.message)
    return new Response(JSON.stringify({ error: 'Could not open billing portal. Try again in a moment.' }), { status: 500, headers })
  }
}
