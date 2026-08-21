import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function Loyalty({ brand }) {
  const [tab, setTab] = useState('rewards')
  const [rewards, setRewards] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingReward, setEditingReward] = useState(null)
  const [saving, setSaving] = useState(false)
  const [stats, setStats] = useState({ totalRewards: 0, totalEarned: 0, totalRedemptions: 0 })
  const [form, setForm] = useState({
    name: '',
    points_required: '',
    reward_type: 'discount_code',
    reward_value: '',
    active: true,
  })

  // Members state
  const [members, setMembers] = useState([])
  const [membersLoading, setMembersLoading] = useState(true)
  const [memberSearch, setMemberSearch] = useState('')
  const [memberSort, setMemberSort] = useState('balance')
  const [expandedMember, setExpandedMember] = useState(null)
  const [memberHistory, setMemberHistory] = useState([])

  // Cooldown settings (storefronts)
  const [cooldownHours, setCooldownHours] = useState(12)
  const [cooldownSaving, setCooldownSaving] = useState(false)
  const [cooldownSaved, setCooldownSaved] = useState(false)

  // Autopilot state
  const [autopilot, setAutopilot] = useState({
    reward_ready: true,
    welcome: true,
    winback: true,
    winback_days: 30,
    reward_subject: '',
    reward_message: '',
    welcome_subject: '',
    welcome_message: '',
    winback_subject: '',
    winback_message: '',
  })
  const [autopilotSaving, setAutopilotSaving] = useState(false)
  const [autopilotSaved, setAutopilotSaved] = useState(false)
  const [autopilotStats, setAutopilotStats] = useState({ reward_ready: 0, welcome: 0, winback: 0, attribution: 0 })
  const [flowBreakdown, setFlowBreakdown] = useState({ reward_ready: 0, welcome: 0, winback: 0 })
  const [expandedFlow, setExpandedFlow] = useState(null)

  // Broadcast state
  const [broadcast, setBroadcast] = useState({ subject: '', message: '' })
  const [broadcastSending, setBroadcastSending] = useState(false)
  const [broadcastResult, setBroadcastResult] = useState(null)

  useEffect(() => {
    loadRewards()
    loadStats()
    loadMembers()
    if (brand) {
      setCooldownHours(brand.loyalty_cooldown_hours ?? 12)
      setAutopilot({
        reward_ready: brand.autopilot_reward_ready !== false,
        welcome: brand.autopilot_welcome !== false,
        winback: brand.autopilot_winback !== false,
        winback_days: brand.winback_days ?? 30,
        reward_subject: brand.autopilot_reward_subject || '',
        reward_message: brand.autopilot_reward_message || '',
        welcome_subject: brand.autopilot_welcome_subject || '',
        welcome_message: brand.autopilot_welcome_message || '',
        winback_subject: brand.autopilot_winback_subject || '',
        winback_message: brand.autopilot_winback_message || '',
      })
      if (brand.business_type === 'storefront') loadAutopilotStats()
    }
  }, [brand])

  async function loadMembers() {
    if (!supabase || !brand?.id || brand.id === 'demo') {
      setMembers([])
      setMembersLoading(false)
      return
    }

    try {
      // Step 1: Get loyalty points
      const { data: points, error: pointsErr } = await supabase
        .from('loyalty_points')
        .select('contact_id, points, type, created_at, product_id, reward_id')
        .eq('brand_id', brand.id)

      if (pointsErr) { console.error('Points error:', pointsErr); setMembersLoading(false); return }
      if (!points || points.length === 0) { setMembers([]); setMembersLoading(false); return }

      // Step 2: Get contacts - use the exact same query pattern as Consumers page
      const { data: allContacts, error: contactsErr } = await supabase
        .from('contacts')
        .select('*')
        .eq('brand_id', brand.id)
        .order('created_at', { ascending: false })

      if (contactsErr || !allContacts) { setMembers([]); setMembersLoading(false); return }

      // Step 3: Get products for name lookup
      const { data: allProducts } = await supabase
        .from('products')
        .select('id, name')
        .eq('brand_id', brand.id)

      const productMap = {}
      ;(allProducts || []).forEach(p => { productMap[p.id] = p.name })

      // Step 4: Match contacts to loyalty points
      const contactIdsWithPoints = new Set(points.map(p => p.contact_id).filter(Boolean))
      const contacts = allContacts.filter(c => contactIdsWithPoints.has(c.id))

      // Build member objects
      const memberMap = contacts.map(contact => {
        const contactPoints = points.filter(p => p.contact_id === contact.id)
        const earned = contactPoints.filter(p => p.type === 'earned').reduce((sum, p) => sum + (p.points || 0), 0)
        const redeemed = contactPoints.filter(p => p.type === 'redeemed').reduce((sum, p) => sum + Math.abs(p.points || 0), 0)
        const lastActivity = contactPoints.reduce((latest, p) => {
          const d = new Date(p.created_at)
          return d > latest ? d : latest
        }, new Date(0))
        const productsScanned = [...new Set(contactPoints.filter(p => p.type === 'earned' && p.product_id).map(p => productMap[p.product_id]).filter(Boolean))]

        return {
          ...contact,
          totalEarned: earned,
          totalRedeemed: redeemed,
          balance: earned - redeemed,
          lastActivity,
          productsScanned,
          history: contactPoints.map(p => ({ ...p, products: p.product_id ? { name: productMap[p.product_id] } : null })),
        }
      })

      setMembers(memberMap)
    } catch (err) {
      console.error('loadMembers error:', err)
    }
    setMembersLoading(false)
  }

  async function toggleMemberHistory(member) {
    if (expandedMember === member.id) {
      setExpandedMember(null)
      setMemberHistory([])
      return
    }
    setExpandedMember(member.id)
    setMemberHistory(member.history.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
  }

  async function loadRewards() {
    if (!supabase || !brand?.id || brand.id === 'demo') {
      setRewards([])
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('loyalty_rewards')
      .select('*')
      .eq('brand_id', brand.id)
      .order('points_required')
    setRewards(data || [])
    setLoading(false)
  }

  async function loadStats() {
    if (!supabase || !brand?.id || brand.id === 'demo') return
    const { data } = await supabase
      .from('loyalty_points')
      .select('points, type')
      .eq('brand_id', brand.id)
    if (data) {
      const earned = data.filter(d => d.type === 'earned').reduce((sum, d) => sum + (d.points || 0), 0)
      const redemptions = data.filter(d => d.type === 'redeemed').length
      setStats(s => ({ ...s, totalEarned: earned, totalRedemptions: redemptions }))
    }
  }

  const openCreate = () => {
    setEditingReward(null)
    setForm({ name: '', points_required: '', reward_type: 'discount_code', reward_value: '', active: true })
    setShowModal(true)
  }

  const openEdit = (reward) => {
    setEditingReward(reward)
    setForm({
      name: reward.name,
      points_required: reward.points_required,
      reward_type: reward.reward_type || 'discount_code',
      reward_value: reward.reward_value || '',
      active: reward.active !== false,
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!supabase || !brand?.id) return
    setSaving(true)

    const payload = {
      name: form.name,
      points_required: parseInt(form.points_required),
      reward_type: form.reward_type,
      reward_value: form.reward_value,
      active: form.active,
    }

    if (editingReward) {
      const { data, error } = await supabase
        .from('loyalty_rewards')
        .update(payload)
        .eq('id', editingReward.id)
        .select()
        .single()
      if (error) {
        alert(`Error: ${error.message}`)
      } else if (data) {
        setRewards(rewards.map(r => r.id === data.id ? data : r))
      }
    } else {
      const { data, error } = await supabase
        .from('loyalty_rewards')
        .insert({ ...payload, brand_id: brand.id })
        .select()
        .single()
      if (error) {
        alert(`Error: ${error.message}`)
      } else if (data) {
        setRewards([...rewards, data].sort((a, b) => a.points_required - b.points_required))
      }
    }

    setSaving(false)
    setShowModal(false)
    setEditingReward(null)
    loadStats()
  }

  const handleDelete = async (reward) => {
    if (!confirm(`Delete "${reward.name}"?`)) return
    if (supabase) {
      const { error } = await supabase.from('loyalty_rewards').delete().eq('id', reward.id)
      if (error) {
        alert(`Error: ${error.message}`)
        return
      }
    }
    setRewards(rewards.filter(r => r.id !== reward.id))
  }

  const saveCooldown = async () => {
    if (!supabase || !brand?.id) return
    setCooldownSaving(true)
    const { error } = await supabase.from('brands').update({
      loyalty_cooldown_hours: cooldownHours,
    }).eq('id', brand.id)
    if (error) alert('Error saving: ' + error.message)
    else { setCooldownSaved(true); setTimeout(() => setCooldownSaved(false), 2000) }
    setCooldownSaving(false)
  }

  async function loadAutopilotStats() {
    if (!supabase || !brand?.id || brand.id === 'demo') return
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const thirtyISO = thirtyDaysAgo.toISOString()

    // Get sent counts per flow (last 30 days)
    const { data: sentEmails } = await supabase
      .from('autopilot_emails')
      .select('flow, created_at, contact_id')
      .eq('brand_id', brand.id)
      .eq('outcome', 'sent')
      .gte('created_at', thirtyISO)

    if (sentEmails) {
      const counts = { reward_ready: 0, welcome: 0, winback: 0 }
      for (const e of sentEmails) {
        if (counts[e.flow] !== undefined) counts[e.flow]++
      }
      setAutopilotStats(prev => ({ ...prev, ...counts }))

      // Attribution: members who earned a point within 7 days of receiving any autopilot email
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
      const emailContactDates = sentEmails.map(e => ({ contact_id: e.contact_id, sent_at: new Date(e.created_at) }))

      if (emailContactDates.length > 0) {
        const uniqueContacts = [...new Set(emailContactDates.map(e => e.contact_id))]

        // Get earned points for these contacts in the last 30 days
        const { data: earnedPoints } = await supabase
          .from('loyalty_points')
          .select('contact_id, created_at')
          .eq('brand_id', brand.id)
          .eq('type', 'earned')
          .in('contact_id', uniqueContacts)
          .gte('created_at', thirtyISO)

        if (earnedPoints) {
          const attributedContacts = new Set()
          const flowAttributed = { reward_ready: new Set(), welcome: new Set(), winback: new Set() }

          for (const point of earnedPoints) {
            const pointDate = new Date(point.created_at)
            for (const email of emailContactDates) {
              if (email.contact_id === point.contact_id && pointDate >= email.sent_at && (pointDate - email.sent_at) <= sevenDaysMs) {
                attributedContacts.add(point.contact_id)
                // Find which flow this email was
                const matchingEmail = sentEmails.find(e => e.contact_id === email.contact_id && e.created_at === email.sent_at.toISOString())
                if (matchingEmail && flowAttributed[matchingEmail.flow]) {
                  flowAttributed[matchingEmail.flow].add(point.contact_id)
                }
                break
              }
            }
          }

          setAutopilotStats(prev => ({ ...prev, attribution: attributedContacts.size }))
          setFlowBreakdown({
            reward_ready: flowAttributed.reward_ready.size,
            welcome: flowAttributed.welcome.size,
            winback: flowAttributed.winback.size,
          })
        }
      }
    }
  }

  const saveAutopilot = async () => {
    if (!supabase || !brand?.id) return
    setAutopilotSaving(true)
    const { error } = await supabase.from('brands').update({
      autopilot_reward_ready: autopilot.reward_ready,
      autopilot_welcome: autopilot.welcome,
      autopilot_winback: autopilot.winback,
      winback_days: autopilot.winback_days,
      autopilot_reward_subject: autopilot.reward_subject || null,
      autopilot_reward_message: autopilot.reward_message || null,
      autopilot_welcome_subject: autopilot.welcome_subject || null,
      autopilot_welcome_message: autopilot.welcome_message || null,
      autopilot_winback_subject: autopilot.winback_subject || null,
      autopilot_winback_message: autopilot.winback_message || null,
    }).eq('id', brand.id)
    if (error) alert('Error saving: ' + error.message)
    else { setAutopilotSaved(true); setTimeout(() => setAutopilotSaved(false), 2000) }
    setAutopilotSaving(false)
  }

  const typeLabels = {
    discount_code: 'Discount Code',
    free_product: 'Free Product',
    custom: 'Custom',
  }

  const filteredMembers = members
    .filter(m => {
      if (!memberSearch) return true
      const q = memberSearch.toLowerCase()
      return (m.first_name || '').toLowerCase().includes(q) || (m.last_name || '').toLowerCase().includes(q) || (m.email || '').toLowerCase().includes(q)
    })
    .sort((a, b) => {
      if (memberSort === 'balance') return b.balance - a.balance
      if (memberSort === 'earned') return b.totalEarned - a.totalEarned
      if (memberSort === 'recent') return b.lastActivity - a.lastActivity
      if (memberSort === 'name') return (a.first_name || '').localeCompare(b.first_name || '')
      return 0
    })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700 }}>Loyalty</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
            Manage your rewards program and members
          </p>
        </div>
        {tab === 'rewards' && (
          <button className="btn btn-primary" onClick={openCreate}>+ Add Reward</button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 28, borderBottom: '1px solid var(--border)' }}>
        {[
          { key: 'rewards', label: 'Rewards' },
          { key: 'members', label: `Members${members.length ? ` (${members.length})` : ''}` },
          ...(brand?.business_type === 'storefront' ? [{ key: 'settings', label: 'Settings' }] : []),
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '10px 20px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
            background: 'none', border: 'none', borderBottom: tab === t.key ? '2px solid white' : '2px solid transparent',
            color: tab === t.key ? 'var(--text)' : 'var(--text-muted)',
            transition: 'all 0.2s',
          }}>{t.label}</button>
        ))}
      </div>

      {tab === 'rewards' && <>
      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
            Total Rewards
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>{rewards.length}</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
            Total Points Earned
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>{stats.totalEarned.toLocaleString()}</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
            Total Redemptions
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>{stats.totalRedemptions.toLocaleString()}</div>
        </div>
      </div>

      {/* Rewards List */}
      {loading ? (
        <div style={{ color: 'var(--text-muted)', padding: 40, textAlign: 'center' }}>Loading...</div>
      ) : rewards.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 8 }}>No rewards yet</div>
          <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
            Create a loyalty reward that consumers can redeem with the points they earn.
          </p>
          <button className="btn btn-primary" onClick={openCreate}>+ Add Reward</button>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Name', 'Points Required', 'Type', 'Status', ''].map(h => (
                    <th key={h} style={{
                      padding: '12px 16px', textAlign: 'left',
                      fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)',
                      textTransform: 'uppercase', letterSpacing: '0.5px',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rewards.map(reward => (
                  <tr key={reward.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>{reward.name}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                      {reward.points_required?.toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '3px 8px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 600,
                        background: 'rgba(161, 161, 170, 0.1)', color: 'var(--text-muted)',
                      }}>
                        {typeLabels[reward.reward_type] || reward.reward_type}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600,
                        background: reward.active !== false ? 'rgba(34, 197, 94, 0.15)' : 'rgba(161, 161, 170, 0.1)',
                        color: reward.active !== false ? 'var(--success)' : 'var(--text-muted)',
                      }}>
                        {reward.active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                          onClick={() => openEdit(reward)}>
                          Edit
                        </button>
                        <button style={{
                          background: 'none', border: 'none', color: 'var(--danger)',
                          fontSize: '0.8rem', cursor: 'pointer', padding: '6px 14px',
                        }} onClick={() => handleDelete(reward)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      </>}

      {/* Members Tab */}
      {tab === 'members' && <>
        {/* Members Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
          {[
            { label: 'Total Members', value: members.length },
            { label: 'Total Points Earned', value: stats.totalEarned.toLocaleString() },
            { label: 'Total Redemptions', value: stats.totalRedemptions.toLocaleString() },
            { label: 'Avg Balance', value: members.length ? Math.round(members.reduce((s, m) => s + m.balance, 0) / members.length) : 0 },
          ].map(s => (
            <div key={s.label} className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
                {s.label}
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Search and Sort */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <input className="input" placeholder="Search by name or email..." value={memberSearch}
            onChange={e => setMemberSearch(e.target.value)}
            style={{ flex: 1 }} />
          <select className="input" value={memberSort} onChange={e => setMemberSort(e.target.value)} style={{ width: 180 }}>
            <option value="balance">Sort by Balance</option>
            <option value="earned">Sort by Total Earned</option>
            <option value="recent">Sort by Recent Activity</option>
            <option value="name">Sort by Name</option>
          </select>
        </div>

        {/* Members Table */}
        {membersLoading ? (
          <div style={{ color: 'var(--text-muted)', padding: 40, textAlign: 'center' }}>Loading...</div>
        ) : filteredMembers.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 8 }}>
              {memberSearch ? 'No members match your search' : 'No loyalty members yet'}
            </div>
            <p style={{ color: 'var(--text-muted)' }}>
              {memberSearch ? 'Try a different search term.' : 'Members will appear here once consumers earn their first loyalty point.'}
            </p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['First', 'Last', 'Phone', 'Email', 'Balance', 'Earned', 'Redeemed', 'Products', 'Last Activity'].map(h => (
                      <th key={h} style={{
                        padding: '12px 16px', textAlign: 'left',
                        fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)',
                        textTransform: 'uppercase', letterSpacing: '0.5px',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map(member => (
                    <>
                      <tr key={member.id} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                        onClick={() => toggleMemberHistory(member)}>
                        <td style={{ padding: '12px 16px', fontWeight: 500 }}>
                          <span style={{ marginRight: 8, fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {expandedMember === member.id ? '▼' : '▶'}
                          </span>
                          {member.first_name || '—'}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 500 }}>{member.last_name || '—'}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{member.phone || '—'}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{member.email}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700,
                            background: member.balance > 0 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(161, 161, 170, 0.1)',
                            color: member.balance > 0 ? 'var(--success)' : 'var(--text-muted)',
                          }}>
                            {member.balance} pts
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{member.totalEarned}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{member.totalRedeemed}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {member.productsScanned.length > 0 ? member.productsScanned.join(', ') : '—'}
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                          {member.lastActivity.getFullYear() > 1970 ? member.lastActivity.toLocaleDateString() : '—'}
                        </td>
                      </tr>
                      {expandedMember === member.id && (
                        <tr key={`${member.id}-history`} style={{ background: 'rgba(255,255,255,0.02)' }}>
                          <td colSpan={8} style={{ padding: '0 16px 16px 44px' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8, marginTop: 8 }}>
                              Point History
                            </div>
                            {memberHistory.length === 0 ? (
                              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No history</div>
                            ) : (
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                                <thead>
                                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                    {['Date', 'Type', 'Points', 'Product / Reward'].map(h => (
                                      <th key={h} style={{ padding: '6px 12px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {memberHistory.map((h, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                                      <td style={{ padding: '6px 12px', color: 'var(--text-muted)' }}>
                                        {new Date(h.created_at).toLocaleDateString()}
                                      </td>
                                      <td style={{ padding: '6px 12px' }}>
                                        <span style={{
                                          padding: '2px 8px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 600,
                                          background: h.type === 'earned' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                          color: h.type === 'earned' ? 'var(--success)' : 'var(--danger)',
                                        }}>
                                          {h.type === 'earned' ? 'Earned' : 'Redeemed'}
                                        </span>
                                      </td>
                                      <td style={{ padding: '6px 12px', fontWeight: 600 }}>
                                        {h.type === 'earned' ? '+' : ''}{h.points}
                                      </td>
                                      <td style={{ padding: '6px 12px', color: 'var(--text-muted)' }}>
                                        {h.type === 'earned' ? (h.products?.name || '—') : (rewards.find(r => r.id === h.reward_id)?.name || '—')}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </>}

      {/* Create/Edit Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
        }} onClick={() => { setShowModal(false); setEditingReward(null) }}>
          <div className="card" style={{ width: 480, maxWidth: '95vw', maxHeight: '90vh', overflow: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 20 }}>
              {editingReward ? 'Edit Reward' : 'Add Reward'}
            </h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                  Name
                </label>
                <input className="input" placeholder="e.g. 10% Off Next Order" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                  Points Required
                </label>
                <input className="input" type="number" min="1" placeholder="e.g. 500" value={form.points_required}
                  onChange={e => setForm({ ...form, points_required: e.target.value })} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                  Reward Type
                </label>
                <select className="input" value={form.reward_type}
                  onChange={e => setForm({ ...form, reward_type: e.target.value })}>
                  <option value="discount_code">Discount Code</option>
                  <option value="free_product">Free Product</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                  Reward Value
                </label>
                <input className="input" placeholder={
                  form.reward_type === 'discount_code' ? 'e.g. SAVE10'
                    : form.reward_type === 'free_product' ? 'e.g. Free T-Shirt'
                    : 'Describe the reward'
                } value={form.reward_value}
                  onChange={e => setForm({ ...form, reward_value: e.target.value })} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Active</label>
                <div onClick={() => setForm({ ...form, active: !form.active })} style={{
                  width: 52, height: 28, borderRadius: 14, cursor: 'pointer',
                  background: form.active ? 'var(--success)' : '#3F3F46',
                  position: 'relative', transition: 'background 0.2s',
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', background: 'white',
                    position: 'absolute', top: 3,
                    left: form.active ? 27 : 3,
                    transition: 'left 0.2s',
                  }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }}
                  onClick={() => { setShowModal(false); setEditingReward(null) }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
                  {saving ? 'Saving...' : editingReward ? 'Save Changes' : 'Add Reward'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settings Tab (storefronts only) */}
      {tab === 'settings' && brand?.business_type === 'storefront' && (
        <div style={{ maxWidth: 780 }}>
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 4 }}>Scan Cooldown</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 }}>
              How long a customer has to wait before earning another loyalty point from your Counter QR.
              This prevents someone from scanning the same code repeatedly to farm points.
            </p>

            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>
              Cooldown (hours)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <input className="input" type="number" min="0" max="168" step="1"
                value={cooldownHours}
                onChange={e => setCooldownHours(parseInt(e.target.value) || 0)}
                style={{ width: 100, fontSize: '1rem', padding: '10px 12px', textAlign: 'center' }} />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {cooldownHours === 0 ? 'No cooldown (every scan earns)'
                  : cooldownHours < 24 ? `${cooldownHours} hour${cooldownHours === 1 ? '' : 's'} between points`
                  : `${Math.round(cooldownHours / 24)} day${Math.round(cooldownHours / 24) === 1 ? '' : 's'} between points`}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
              {[4, 8, 12, 24, 48].map(h => (
                <button key={h} onClick={() => setCooldownHours(h)} style={{
                  padding: '6px 14px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600,
                  border: 'none', cursor: 'pointer',
                  background: cooldownHours === h ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
                  color: cooldownHours === h ? '#fff' : 'var(--text-muted)',
                }}>{h}h</button>
              ))}
            </div>

            <button className="btn btn-primary" onClick={saveCooldown} disabled={cooldownSaving}
              style={{ fontSize: '0.85rem', padding: '10px 24px' }}>
              {cooldownSaving ? 'Saving...' : cooldownSaved ? 'Saved!' : 'Save'}
            </button>
          </div>

          {/* Storefront Autopilot */}
          <div style={{ marginTop: 24 }}>
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 4 }}>Storefront Autopilot</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                Automated emails that keep your loyalty members engaged. Click a card to customize the message.
              </p>
            </div>

            {/* Attribution headline */}
            {autopilotStats.attribution > 0 && (
              <div style={{
                padding: '14px 18px', borderRadius: 10, marginBottom: 16,
                background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.2)',
              }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--success)' }}>
                  Autopilot brought back {autopilotStats.attribution} customer{autopilotStats.attribution === 1 ? '' : 's'} this month
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  {[
                    flowBreakdown.reward_ready > 0 && `${flowBreakdown.reward_ready} from Reward Ready`,
                    flowBreakdown.welcome > 0 && `${flowBreakdown.welcome} from Welcome`,
                    flowBreakdown.winback > 0 && `${flowBreakdown.winback} from Win-Back`,
                  ].filter(Boolean).join(' · ') || 'Members who visited within 7 days of an autopilot email'}
                </div>
              </div>
            )}

            {(() => {
              const flows = [
                {
                  key: 'reward_ready', label: 'Reward Ready', icon: '🎁',
                  desc: 'When they earn a reward', count: autopilotStats.reward_ready,
                  subjectKey: 'reward_subject', messageKey: 'reward_message',
                  subjectDefault: 'You earned {reward}!',
                  messageDefault: 'Hey {name}, you have enough points to redeem {reward} at {store}. Come visit to claim it!',
                  placeholders: '{name}, {store}, {reward}, {points}',
                },
                {
                  key: 'welcome', label: 'Welcome', icon: '👋',
                  desc: 'When they first join', count: autopilotStats.welcome,
                  subjectKey: 'welcome_subject', messageKey: 'welcome_message',
                  subjectDefault: "You're in! Here's how loyalty works at {store}",
                  messageDefault: 'Welcome to {store} loyalty, {name}! Earn 1 point every time you visit. You currently have {points} points.',
                  placeholders: '{name}, {store}, {points}',
                },
                {
                  key: 'winback', label: 'Win-Back', icon: '💌',
                  desc: `After ${autopilot.winback_days}d inactive`, count: autopilotStats.winback,
                  subjectKey: 'winback_subject', messageKey: 'winback_message',
                  subjectDefault: "It's been a while, {name}!",
                  messageDefault: "Hey {name}, you have {points} points waiting at {store}. Come visit and keep earning toward your next reward!",
                  placeholders: '{name}, {store}, {points}, {reward}',
                },
              ]
              const activeFlow = flows.find(f => f.key === expandedFlow)

              return (
                <>
                  {/* Flow cards — equal height row */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: activeFlow ? 0 : 20 }}>
                    {flows.map(flow => {
                      const isSelected = expandedFlow === flow.key
                      return (
                        <div
                          key={flow.key}
                          onClick={() => setExpandedFlow(isSelected ? null : flow.key)}
                          style={{
                            padding: '16px', borderRadius: isSelected ? '10px 10px 0 0' : 10,
                            background: isSelected ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.03)',
                            border: isSelected ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(255,255,255,0.06)',
                            borderBottom: isSelected ? '1px solid transparent' : undefined,
                            cursor: 'pointer', transition: 'all 0.15s',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <span style={{ fontSize: '1.4rem' }}>{flow.icon}</span>
                            <div
                              onClick={e => { e.stopPropagation(); setAutopilot(prev => ({ ...prev, [flow.key]: !prev[flow.key] })) }}
                              style={{
                                width: 44, height: 24, borderRadius: 12, cursor: 'pointer',
                                background: autopilot[flow.key] ? 'var(--success)' : '#3F3F46',
                                position: 'relative', transition: 'background 0.2s',
                              }}
                            >
                              <div style={{
                                width: 18, height: 18, borderRadius: '50%', background: 'white',
                                position: 'absolute', top: 3,
                                left: autopilot[flow.key] ? 23 : 3,
                                transition: 'left 0.2s',
                              }} />
                            </div>
                          </div>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 2 }}>{flow.label}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8 }}>{flow.desc}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              {flow.count > 0 ? `${flow.count} sent (30d)` : 'No sends yet'}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: isSelected ? '#fff' : 'var(--text-muted)', opacity: isSelected ? 1 : 0.5 }}>
                              {isSelected ? '▲' : '✎'}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Editor panel — full width below cards */}
                  {activeFlow && (
                    <div style={{
                      padding: '20px', marginBottom: 20, borderRadius: '0 0 10px 10px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.15)', borderTop: 'none',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Customize {activeFlow.label} Email</div>
                        <button
                          onClick={() => setExpandedFlow(null)}
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem', padding: '4px 8px' }}
                        >Done</button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
                            Subject Line
                          </label>
                          <input
                            className="input"
                            placeholder={activeFlow.subjectDefault}
                            value={autopilot[activeFlow.subjectKey]}
                            onChange={e => setAutopilot(prev => ({ ...prev, [activeFlow.subjectKey]: e.target.value }))}
                            style={{ fontSize: '0.85rem', padding: '10px 12px' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
                            Message Body
                          </label>
                          <textarea
                            className="input"
                            placeholder={activeFlow.messageDefault}
                            value={autopilot[activeFlow.messageKey]}
                            onChange={e => setAutopilot(prev => ({ ...prev, [activeFlow.messageKey]: e.target.value }))}
                            rows={3}
                            style={{ fontSize: '0.85rem', padding: '10px 12px', resize: 'vertical' }}
                          />
                        </div>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 8, opacity: 0.7 }}>
                        Leave blank to use defaults. Placeholders: {activeFlow.placeholders}
                      </div>
                    </div>
                  )}
                </>
              )
            })()}

            {/* Winback days */}
            <div className="card" style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
                Win-Back trigger (days since last visit)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <input className="input" type="number" min="7" max="180" step="1"
                  value={autopilot.winback_days}
                  onChange={e => setAutopilot(prev => ({ ...prev, winback_days: parseInt(e.target.value) || 30 }))}
                  style={{ width: 80, fontSize: '1rem', padding: '10px 12px', textAlign: 'center' }} />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  days without a visit triggers a win-back email
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[14, 30, 45, 60, 90].map(d => (
                  <button key={d} onClick={() => setAutopilot(prev => ({ ...prev, winback_days: d }))} style={{
                    padding: '6px 14px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600,
                    border: 'none', cursor: 'pointer',
                    background: autopilot.winback_days === d ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
                    color: autopilot.winback_days === d ? '#fff' : 'var(--text-muted)',
                  }}>{d}d</button>
                ))}
              </div>
            </div>

            <button className="btn btn-primary" onClick={saveAutopilot} disabled={autopilotSaving}
              style={{ fontSize: '0.85rem', padding: '10px 24px' }}>
              {autopilotSaving ? 'Saving...' : autopilotSaved ? 'Saved!' : 'Save Autopilot Settings'}
            </button>
          </div>

          {/* Broadcast */}
          <div className="card" style={{ marginTop: 24 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 4 }}>Send a Blast</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 }}>
              Send a one-time email to all your loyalty members who opted in. Flash sales, special hours, announcements.
              Uses {'{name}'} and {'{store}'} placeholders.
            </p>

            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
              Subject Line
            </label>
            <input
              className="input"
              placeholder="e.g. Half off everything for the next 6 hours!"
              value={broadcast.subject}
              onChange={e => setBroadcast(prev => ({ ...prev, subject: e.target.value }))}
              style={{ marginBottom: 12 }}
            />

            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
              Message
            </label>
            <textarea
              className="input"
              placeholder={`e.g. Hey {name}, we're running a surprise flash sale at {store} today only. Come in before 6 PM and everything is 50% off!`}
              value={broadcast.message}
              onChange={e => setBroadcast(prev => ({ ...prev, message: e.target.value }))}
              rows={4}
              style={{ resize: 'vertical', marginBottom: 16 }}
            />

            {broadcastResult && (
              <div style={{
                padding: '12px 16px', borderRadius: 10, marginBottom: 16,
                background: broadcastResult.error ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.08)',
                border: broadcastResult.error ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(34, 197, 94, 0.2)',
              }}>
                {broadcastResult.error ? (
                  <div style={{ fontSize: '0.85rem', color: 'var(--danger)' }}>{broadcastResult.error}</div>
                ) : (
                  <div style={{ fontSize: '0.85rem' }}>
                    <strong style={{ color: 'var(--success)' }}>{broadcastResult.sent} sent</strong>
                    {broadcastResult.skipped > 0 && <span style={{ color: 'var(--text-muted)' }}> · {broadcastResult.skipped} skipped (no consent)</span>}
                    {broadcastResult.error_count > 0 && <span style={{ color: 'var(--danger)' }}> · {broadcastResult.error_count} errors</span>}
                  </div>
                )}
              </div>
            )}

            <button
              className="btn btn-primary"
              disabled={broadcastSending || !broadcast.subject.trim() || !broadcast.message.trim()}
              onClick={async () => {
                const memberCount = members.length || '?'
                if (!window.confirm(`This will email up to ${memberCount} loyalty members right now. Continue?`)) return
                setBroadcastSending(true)
                setBroadcastResult(null)
                try {
                  const res = await fetch('/.netlify/functions/send-broadcast', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ brand_id: brand.id, subject: broadcast.subject, message: broadcast.message }),
                  })
                  const data = await res.json()
                  setBroadcastResult(data)
                  if (data.sent > 0) setBroadcast({ subject: '', message: '' })
                } catch (err) {
                  setBroadcastResult({ error: 'Failed to send. Please try again.' })
                }
                setBroadcastSending(false)
              }}
              style={{ fontSize: '0.85rem', padding: '10px 24px' }}
            >
              {broadcastSending ? 'Sending...' : 'Send to All Members'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
