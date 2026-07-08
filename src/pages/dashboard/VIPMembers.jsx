import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function VIPMembers({ brand }) {
  const [members, setMembers] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMembers()
  }, [brand])

  async function loadMembers() {
    if (!supabase || !brand?.id || brand.id === 'demo') {
      setMembers([])
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('vip_members')
      .select('*, products(name)')
      .eq('brand_id', brand.id)
      .order('joined_at', { ascending: false })
    setMembers(data || [])
    setLoading(false)
  }

  const exportCSV = () => {
    if (members.length === 0) return
    const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Product', 'City', 'Joined']
    const rows = members.map(m => [
      m.first_name,
      m.last_name,
      m.email || '',
      m.phone,
      m.products?.name || '',
      m.city || '',
      new Date(m.joined_at).toLocaleDateString(),
    ])
    const csv = [headers, ...rows].map(row =>
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const link = document.createElement('a')
    link.download = `vip-members-${new Date().toISOString().split('T')[0]}.csv`
    link.href = URL.createObjectURL(blob)
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const filtered = members.filter(m =>
    `${m.first_name} ${m.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    (m.email || '').toLowerCase().includes(search.toLowerCase()) ||
    m.phone.includes(search) ||
    (m.city || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700 }}>VIP Members</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
            {members.length} member{members.length !== 1 ? 's' : ''} collected via product scans
          </p>
        </div>
        <button className="btn btn-primary" onClick={exportCSV}>Export CSV</button>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-muted)', padding: 40, textAlign: 'center' }}>Loading...</div>
      ) : members.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 8 }}>No VIP members yet</div>
          <p style={{ color: 'var(--text-muted)' }}>
            When consumers scan your QR codes and sign up, they'll appear here.
          </p>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 20 }}>
            <input
              className="input"
              placeholder="Search by name, email, phone, or city..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ maxWidth: 400 }}
            />
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Name', 'Email', 'Phone', 'Product', 'Location', 'Joined'].map(h => (
                    <th key={h} style={{
                      padding: '14px 20px', textAlign: 'left',
                      fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)',
                      textTransform: 'uppercase', letterSpacing: '0.5px'
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => (
                  <tr key={m.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '14px 20px', fontWeight: 500 }}>
                      {m.first_name} {m.last_name}
                    </td>
                    <td style={{ padding: '14px 20px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      {m.email || '-'}
                    </td>
                    <td style={{ padding: '14px 20px', color: '#FAFAFA', fontWeight: 500 }}>
                      {m.phone}
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: '0.9rem' }}>
                      {m.products?.name || '-'}
                    </td>
                    <td style={{ padding: '14px 20px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      {m.city || '-'}
                    </td>
                    <td style={{ padding: '14px 20px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      {new Date(m.joined_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
