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

  useEffect(() => {
    loadRewards()
    loadStats()
    loadMembers()
  }, [brand])

  async function loadMembers() {
    if (!supabase || !brand?.id || brand.id === 'demo') {
      setMembers([])
      setMembersLoading(false)
      return
    }

    // Get all loyalty points with contact info and product names
    const { data: points } = await supabase
      .from('loyalty_points')
      .select('contact_id, points, type, created_at, product_id, products(name), loyalty_rewards(name)')
      .eq('brand_id', brand.id)

    if (!points || points.length === 0) {
      setMembers([])
      setMembersLoading(false)
      return
    }

    // Get unique contact IDs
    const contactIds = [...new Set(points.map(p => p.contact_id))]

    // Fetch contact details
    const { data: contacts } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, email, phone, created_at')
      .in('id', contactIds)

    if (!contacts) {
      setMembers([])
      setMembersLoading(false)
      return
    }

    // Build member objects
    const memberMap = contacts.map(contact => {
      const contactPoints = points.filter(p => p.contact_id === contact.id)
      const earned = contactPoints.filter(p => p.type === 'earned').reduce((sum, p) => sum + (p.points || 0), 0)
      const redeemed = contactPoints.filter(p => p.type === 'redeemed').reduce((sum, p) => sum + Math.abs(p.points || 0), 0)
      const lastActivity = contactPoints.reduce((latest, p) => {
        const d = new Date(p.created_at)
        return d > latest ? d : latest
      }, new Date(0))
      const productsScanned = [...new Set(contactPoints.filter(p => p.type === 'earned' && p.products?.name).map(p => p.products.name))]

      return {
        ...contact,
        totalEarned: earned,
        totalRedeemed: redeemed,
        balance: earned - redeemed,
        lastActivity,
        productsScanned,
        history: contactPoints,
      }
    })

    setMembers(memberMap)
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
                    {['First', 'Last', 'Email', 'Balance', 'Earned', 'Redeemed', 'Products', 'Last Activity'].map(h => (
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
                                        {h.type === 'earned' ? (h.products?.name || '—') : (h.loyalty_rewards?.name || '—')}
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
    </div>
  )
}
