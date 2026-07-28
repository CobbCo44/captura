import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function Loyalty({ brand }) {
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

  useEffect(() => {
    loadRewards()
    loadStats()
  }, [brand])

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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700 }}>Loyalty Rewards</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
            Configure rewards consumers can redeem with points
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Reward</button>
      </div>

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
