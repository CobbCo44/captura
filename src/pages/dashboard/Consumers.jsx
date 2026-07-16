import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function Consumers({ brand }) {
  const [vipMembers, setVipMembers] = useState([])
  const [promoEntries, setPromoEntries] = useState([])
  const [warrantyRegs, setWarrantyRegs] = useState([])
  const [eventEntries, setEventEntries] = useState([])
  const [contacts, setContacts] = useState([])
  const [contactSerials, setContactSerials] = useState({}) // contactId -> [{serial, product, channel, po, date}]
  const [expandedContact, setExpandedContact] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadData()
  }, [brand])

  async function loadData() {
    if (!supabase || !brand?.id || brand.id === 'demo') {
      setLoading(false)
      return
    }
    const [vipRes, promoRes, warrantyRes, eventRes, contactsRes] = await Promise.all([
      supabase.from('vip_members').select('*, products(name)').eq('brand_id', brand.id).order('joined_at', { ascending: false }),
      supabase.from('promo_entries').select('*, products(name), promos(title)').eq('brand_id', brand.id).order('entered_at', { ascending: false }),
      supabase.from('warranty_registrations').select('*, products(name)').eq('brand_id', brand.id).order('registered_at', { ascending: false }),
      supabase.from('event_entries').select('*, events(name)').eq('brand_id', brand.id).order('entered_at', { ascending: false }),
      supabase.from('contacts').select('*').eq('brand_id', brand.id).order('created_at', { ascending: false }),
    ])
    if (eventRes.error) console.error('Event entries query error:', eventRes.error)
    setVipMembers(vipRes.data || [])
    setPromoEntries(promoRes.data || [])
    setWarrantyRegs(warrantyRes.data || [])
    setEventEntries(eventRes.data || [])

    const contactsList = contactsRes.data || []
    setContacts(contactsList)

    // Load claimed serials for all contacts
    if (contactsList.length > 0) {
      const contactIds = contactsList.map(c => c.id)
      const { data: claimedSerials } = await supabase
        .from('serials')
        .select('*, batches:batch_id(po_reference, channels:channel_id(name)), products:product_id(name)')
        .eq('status', 'claimed')
        .in('claimed_by_contact_id', contactIds)
        .order('claimed_at', { ascending: false })

      if (claimedSerials) {
        const grouped = {}
        claimedSerials.forEach(s => {
          if (!grouped[s.claimed_by_contact_id]) grouped[s.claimed_by_contact_id] = []
          grouped[s.claimed_by_contact_id].push({
            serial: s.serial,
            product: s.products?.name || '-',
            channel: s.batches?.channels?.name || '-',
            poReference: s.batches?.po_reference || '-',
            claimedAt: s.claimed_at,
          })
        })
        setContactSerials(grouped)
      }
    }

    setLoading(false)
  }

  // Build email -> contact channel lookup for enriching legacy entries
  const emailToChannel = {}
  const emailToContactId = {}
  contacts.forEach(c => {
    const serials = contactSerials[c.id] || []
    if (serials.length > 0 && c.email) {
      const key = c.email.toLowerCase().trim()
      emailToChannel[key] = serials[0].channel
      emailToContactId[key] = c.id
    }
  })

  // Track which contact emails already appear in legacy tables
  const legacyEmails = new Set()

  // Combine into one list — legacy entries enriched with channel data
  const allConsumers = [
    ...vipMembers.map(v => {
      const key = (v.email || '').toLowerCase().trim()
      if (key) legacyEmails.add(key)
      return {
        id: `vip-${v.id}`,
        firstName: v.first_name,
        lastName: v.last_name,
        email: v.email || '',
        phone: v.phone,
        product: v.products?.name || '',
        city: v.city || '',
        type: 'VIP',
        source: 'VIP Signup',
        date: v.joined_at,
        channel: emailToChannel[key] || '-',
        contactId: emailToContactId[key] || null,
      }
    }),
    ...promoEntries.map(p => {
      const key = (p.email || '').toLowerCase().trim()
      if (key) legacyEmails.add(key)
      return {
        id: `promo-${p.id}`,
        firstName: p.first_name,
        lastName: p.last_name,
        email: p.email || '',
        phone: p.phone,
        product: p.products?.name || '',
        city: p.city || '',
        type: 'Promo',
        source: p.promos?.title || 'Promo Entry',
        date: p.entered_at,
        channel: emailToChannel[key] || '-',
        contactId: emailToContactId[key] || null,
      }
    }),
    ...warrantyRegs.map(w => {
      const key = (w.email || '').toLowerCase().trim()
      if (key) legacyEmails.add(key)
      return {
        id: `warranty-${w.id}`,
        firstName: w.first_name,
        lastName: w.last_name,
        email: w.email || '',
        phone: w.phone,
        product: w.products?.name || '',
        city: w.city || '',
        type: 'Warranty',
        source: 'Warranty Registration',
        date: w.registered_at,
        channel: emailToChannel[key] || '-',
        contactId: emailToContactId[key] || null,
      }
    }),
    ...eventEntries.map(ev => {
      const key = (ev.email || '').toLowerCase().trim()
      if (key) legacyEmails.add(key)
      return {
        id: `event-${ev.id}`,
        firstName: ev.first_name,
        lastName: ev.last_name,
        email: ev.email || '',
        phone: ev.phone,
        product: '',
        city: ev.city || '',
        type: 'Event',
        source: ev.events?.name || 'Event Entry',
        date: ev.entered_at,
        channel: emailToChannel[key] || '-',
        contactId: emailToContactId[key] || null,
      }
    }),
  ].sort((a, b) => new Date(b.date) - new Date(a.date))

  const filtered = allConsumers.filter(c => {
    if (filter === 'vip' && c.type !== 'VIP') return false
    if (filter === 'promo' && c.type !== 'Promo') return false
    if (filter === 'warranty' && c.type !== 'Warranty') return false
    if (filter === 'event' && c.type !== 'Event') return false
    if (search) {
      const q = search.toLowerCase()
      return `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.product.toLowerCase().includes(q)
    }
    return true
  })

  const exportCSV = () => {
    if (filtered.length === 0) return
    const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Product', 'Channel', 'City', 'Source', 'Type', 'Date']
    const rows = filtered.map(c => [
      c.firstName, c.lastName, c.email, c.phone,
      c.product, c.channel || '-', c.city, c.source, c.type,
      new Date(c.date).toLocaleDateString(),
    ])
    const csv = [headers, ...rows].map(row =>
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const link = document.createElement('a')
    link.download = `consumers-${filter}-${new Date().toISOString().split('T')[0]}.csv`
    link.href = URL.createObjectURL(blob)
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const tabStyle = (active) => ({
    padding: '8px 16px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
    background: active ? '#FAFAFA' : 'var(--bg-card)',
    color: active ? '#09090B' : 'var(--text-muted)',
    border: active ? 'none' : '1px solid var(--border)',
  })

  if (loading) {
    return <div style={{ color: 'var(--text-muted)', padding: 40, textAlign: 'center' }}>Loading...</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700 }}>Consumer Data</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
            All consumers from VIP signups, promo entries, events, warranty registrations, and serialized QR scans
          </p>
        </div>
        <button className="btn btn-primary" onClick={exportCSV}>Export CSV</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 4 }}>Total Consumers</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#FAFAFA' }}>{allConsumers.length}</div>
        </div>
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 4 }}>Promo Entries</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#D4D4D8' }}>{promoEntries.length}</div>
        </div>
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 4 }}>Event Entries</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#60A5FA' }}>{eventEntries.length}</div>
        </div>
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 4 }}>Warranty Regs</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#A1A1AA' }}>{warrantyRegs.length}</div>
        </div>
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 4 }}>Serial Claims</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#C084FC' }}>{Object.values(contactSerials).flat().length}</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={() => setFilter('all')} style={tabStyle(filter === 'all')}>All ({allConsumers.length})</button>
        <button onClick={() => setFilter('promo')} style={tabStyle(filter === 'promo')}>Promo ({promoEntries.length})</button>
        <button onClick={() => setFilter('event')} style={tabStyle(filter === 'event')}>Event ({eventEntries.length})</button>
        <button onClick={() => setFilter('warranty')} style={tabStyle(filter === 'warranty')}>Warranty ({warrantyRegs.length})</button>
        <input
          className="input"
          placeholder="Search name, email, phone, city, product..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 320, marginLeft: 'auto' }}
        />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 8 }}>No consumers yet</div>
          <p style={{ color: 'var(--text-muted)' }}>
            Consumers will appear here as they sign up through your QR codes.
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Name', 'Email', 'Phone', 'Product', 'Channel', 'City', 'Source', 'Date'].map(h => (
                  <th key={h} style={{
                    padding: '12px 16px', textAlign: 'left',
                    fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)',
                    textTransform: 'uppercase', letterSpacing: '0.5px',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const isExpanded = expandedContact === c.id
                const serials = c.contactId ? (contactSerials[c.contactId] || []) : []
                const isExpandable = c.contactId && serials.length > 0
                return (
                  <React.Fragment key={c.id}>
                    <tr style={{ borderBottom: '1px solid var(--border)', cursor: isExpandable ? 'pointer' : 'default' }}
                      onClick={() => isExpandable && setExpandedContact(isExpanded ? null : c.id)}>
                      <td style={{ padding: '12px 16px', fontWeight: 500, fontSize: '0.85rem' }}>
                        {isExpandable && (
                          <span style={{ display: 'inline-block', width: 16, color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                            {isExpanded ? 'v' : '>'}
                          </span>
                        )}
                        {c.firstName} {c.lastName}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {c.email || '-'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.85rem' }}>{c.phone || '-'}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {c.product || '-'}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {c.channel || '-'}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {c.city || '-'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '3px 10px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 600,
                          background: c.type === 'VIP' ? 'rgba(34, 197, 94, 0.1)' : c.type === 'Event' ? 'rgba(96, 165, 250, 0.1)' : c.type === 'Serial' ? 'rgba(192, 132, 252, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                          color: c.type === 'VIP' ? 'var(--success)' : c.type === 'Event' ? '#60A5FA' : c.type === 'Serial' ? '#C084FC' : '#F59E0B',
                        }}>
                          {c.source}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {new Date(c.date).toLocaleDateString()}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <td colSpan={8} style={{ padding: '12px 16px 16px 32px', background: 'var(--bg)' }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 8 }}>Claimed Products</div>
                          {serials.length === 0 ? (
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No serialized claims</div>
                          ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                              <thead>
                                <tr>
                                  {['Product', 'Serial', 'Channel', 'PO Ref', 'Claimed'].map(h => (
                                    <th key={h} style={{
                                      padding: '6px 10px', textAlign: 'left',
                                      fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)',
                                      textTransform: 'uppercase', borderBottom: '1px solid var(--border)',
                                    }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {serials.map((s, i) => (
                                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '6px 10px' }}>{s.product}</td>
                                    <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontSize: '0.75rem' }}>{s.serial}</td>
                                    <td style={{ padding: '6px 10px', color: 'var(--text-muted)' }}>{s.channel}</td>
                                    <td style={{ padding: '6px 10px', color: 'var(--text-muted)' }}>{s.poReference}</td>
                                    <td style={{ padding: '6px 10px', color: 'var(--text-muted)' }}>
                                      {s.claimedAt ? new Date(s.claimedAt).toLocaleDateString() : '-'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
