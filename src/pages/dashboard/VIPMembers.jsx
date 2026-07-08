import { useState } from 'react'

const demoMembers = [
  { id: 1, firstName: 'Marcus', lastName: 'Williams', email: 'marcus.w@gmail.com', phone: '(713) 555-0142', product: 'Pro Wireless Earbuds', city: 'Houston, TX', joined: '2026-07-05' },
  { id: 2, firstName: 'Sarah', lastName: 'Chen', email: 'sarah.chen@outlook.com', phone: '(305) 555-0198', product: 'Running Shoes V2', city: 'Miami, FL', joined: '2026-07-04' },
  { id: 3, firstName: 'James', lastName: 'Rodriguez', email: 'jrodriguez@yahoo.com', phone: '(512) 555-0167', product: 'Sport Water Bottle', city: 'Austin, TX', joined: '2026-07-03' },
  { id: 4, firstName: 'Priya', lastName: 'Patel', email: 'priya.patel@gmail.com', phone: '(312) 555-0134', product: 'Training Gloves', city: 'Chicago, IL', joined: '2026-07-02' },
  { id: 5, firstName: 'Derek', lastName: 'Johnson', email: 'derek.j@icloud.com', phone: '(206) 555-0189', product: 'Pro Wireless Earbuds', city: 'Seattle, WA', joined: '2026-07-01' },
  { id: 6, firstName: 'Maria', lastName: 'Lopez', email: 'maria.lopez@gmail.com', phone: '(602) 555-0156', product: 'Resistance Bands Set', city: 'Phoenix, AZ', joined: '2026-06-30' },
]

export default function VIPMembers() {
  const [members] = useState(demoMembers)
  const [search, setSearch] = useState('')

  const filtered = members.filter(m =>
    `${m.firstName} ${m.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase()) ||
    m.phone.includes(search) ||
    m.city.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700 }}>VIP Members</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
            {members.length} members collected via product scans
          </p>
        </div>
        <button className="btn btn-primary">Export CSV</button>
      </div>

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
              {['Name', 'Email', 'Phone', 'Product Scanned', 'Location', 'Joined'].map(h => (
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
                <td style={{ padding: '14px 20px' }}>
                  <div style={{ fontWeight: 500 }}>{m.firstName} {m.lastName}</div>
                </td>
                <td style={{ padding: '14px 20px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  {m.email}
                </td>
                <td style={{ padding: '14px 20px', color: '#FAFAFA', fontWeight: 500 }}>
                  {m.phone}
                </td>
                <td style={{ padding: '14px 20px', fontSize: '0.9rem' }}>{m.product}</td>
                <td style={{ padding: '14px 20px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  {m.city}
                </td>
                <td style={{ padding: '14px 20px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{m.joined}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
