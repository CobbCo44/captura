import { createClient } from '@supabase/supabase-js'

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const { brandId, customer } = await req.json()

    if (!brandId || !customer) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Look up Shopify credentials server-side using service role key
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: 'Server not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { data: brand } = await supabase
      .from('brands')
      .select('shopify_store, shopify_token')
      .eq('id', brandId)
      .single()

    if (!brand?.shopify_store || !brand?.shopify_token) {
      // No Shopify connected, silently skip
      return new Response(JSON.stringify({ skipped: true }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const shopifyToken = brand.shopify_token

    // Clean store name
    const store = brand.shopify_store
      .replace(/^https?:\/\//, '')
      .replace(/\.myshopify\.com.*$/, '')
      .replace(/\/$/, '')
      .trim()

    // Search for existing customer by email first
    let existingCustomerId = null
    if (customer.email) {
      const searchRes = await fetch(
        `https://${store}.myshopify.com/admin/api/2024-01/customers/search.json?query=email:${encodeURIComponent(customer.email)}`,
        {
          headers: {
            'X-Shopify-Access-Token': shopifyToken,
            'Content-Type': 'application/json',
          },
        }
      )
      if (searchRes.ok) {
        const searchData = await searchRes.json()
        if (searchData.customers && searchData.customers.length > 0) {
          existingCustomerId = searchData.customers[0].id
        }
      }
    }

    // Format phone to E.164 (Shopify requires this)
    let formattedPhone = undefined
    if (customer.phone) {
      let digits = customer.phone.replace(/\D/g, '')
      if (digits.length === 10) digits = '1' + digits
      if (digits.length === 11 && digits.startsWith('1')) {
        formattedPhone = '+' + digits
      } else if (digits.length > 0) {
        formattedPhone = '+' + digits
      }
    }

    // Build tags with product name included
    let tags = customer.tags || 'captura'
    if (customer.product) {
      const productTag = customer.product.replace(/[,]/g, '').trim()
      tags += `, ${productTag}`
    }

    // Build note with full details
    const noteLines = [customer.note || 'Added via Captura QR scan']
    if (customer.product) noteLines.push(`Product: ${customer.product}`)
    if (customer.city) noteLines.push(`City: ${customer.city}`)
    noteLines.push(`Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`)

    // Build customer data
    const customerData = {
      first_name: customer.firstName,
      last_name: customer.lastName,
      email: customer.email || undefined,
      phone: formattedPhone,
      tags,
      note: noteLines.join('\n'),
      email_marketing_consent: customer.email ? {
        state: 'subscribed',
        opt_in_level: 'single_opt_in',
        consent_updated_at: new Date().toISOString(),
      } : undefined,
      sms_marketing_consent: formattedPhone ? {
        state: 'subscribed',
        opt_in_level: 'single_opt_in',
        consent_updated_at: new Date().toISOString(),
      } : undefined,
      metafields: [
        customer.product && {
          key: 'product_scanned',
          value: customer.product,
          type: 'single_line_text_field',
          namespace: 'captura',
        },
        customer.source && {
          key: 'source',
          value: customer.source,
          type: 'single_line_text_field',
          namespace: 'captura',
        },
        customer.city && {
          key: 'city',
          value: customer.city,
          type: 'single_line_text_field',
          namespace: 'captura',
        },
      ].filter(Boolean),
    }
    if (customerData.metafields.length === 0) delete customerData.metafields

    let response
    if (existingCustomerId) {
      // Update existing customer - merge tags
      const getRes = await fetch(
        `https://${store}.myshopify.com/admin/api/2024-01/customers/${existingCustomerId}.json`,
        {
          headers: {
            'X-Shopify-Access-Token': shopifyToken,
            'Content-Type': 'application/json',
          },
        }
      )
      if (getRes.ok) {
        const existing = await getRes.json()
        const existingTags = existing.customer.tags || ''
        const newTags = customerData.tags
        const mergedTags = [...new Set([...existingTags.split(',').map(t => t.trim()).filter(Boolean), ...newTags.split(',').map(t => t.trim())])].join(', ')
        customerData.tags = mergedTags
      }

      // Don't send metafields on update (Shopify requires different endpoint for that)
      delete customerData.metafields

      response = await fetch(
        `https://${store}.myshopify.com/admin/api/2024-01/customers/${existingCustomerId}.json`,
        {
          method: 'PUT',
          headers: {
            'X-Shopify-Access-Token': shopifyToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ customer: customerData }),
        }
      )
    } else {
      // Create new customer
      response = await fetch(
        `https://${store}.myshopify.com/admin/api/2024-01/customers.json`,
        {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': shopifyToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ customer: customerData }),
        }
      )
    }

    if (!response.ok) {
      const errText = await response.text()
      console.error('Shopify API error:', errText)
      return new Response(JSON.stringify({ error: 'Shopify sync failed' }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const data = await response.json()
    return new Response(JSON.stringify({ success: true, customerId: data.customer.id }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Shopify customer sync error:', err)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
