import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Nav */}
      <nav style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '20px 40px', maxWidth: 1200, margin: '0 auto'
      }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.5px', color: '#FAFAFA' }}>
          Captura
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <Link to="/login" className="btn btn-secondary">Log In</Link>
          <Link to="/login?signup=true" className="btn btn-primary">Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{
        textAlign: 'center', padding: '100px 24px 60px',
        maxWidth: 800, margin: '0 auto'
      }}>
        <div style={{
          display: 'inline-block', padding: '6px 16px', borderRadius: 20,
          background: 'rgba(255, 255, 255, 0.06)', color: '#A1A1AA',
          fontSize: '0.85rem', fontWeight: 600, marginBottom: 24,
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          Consumer Engagement, Captured
        </div>
        <h1 style={{
          fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 800,
          lineHeight: 1.1, marginBottom: 24, letterSpacing: '-1px', color: '#FAFAFA'
        }}>
          Turn every product into a<br />
          <span style={{ color: '#D4D4D8' }}>direct line</span> to your customer
        </h1>
        <p style={{
          fontSize: '1.2rem', color: 'var(--text-muted)', maxWidth: 560,
          margin: '0 auto 40px', lineHeight: 1.6
        }}>
          Custom QR codes that blend into your brand. Capture location data,
          deliver content, and build your VIP list with every scan.
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/login?signup=true" className="btn btn-primary" style={{ padding: '16px 32px', fontSize: '1.05rem' }}>
            Start for Free
          </Link>
          <a href="#how-it-works" className="btn btn-secondary" style={{ padding: '16px 32px', fontSize: '1.05rem' }}>
            See How It Works
          </a>
        </div>
      </section>

      {/* Stats */}
      <section style={{
        display: 'flex', justifyContent: 'center', gap: 60,
        padding: '40px 24px 80px', flexWrap: 'wrap'
      }}>
        {[
          { num: '0.3s', label: 'Avg scan time' },
          { num: '100%', label: 'Mobile-first' },
          { num: 'Real-time', label: 'Location data' },
        ].map(s => (
          <div key={s.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#FAFAFA' }}>{s.num}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </section>

      {/* How It Works */}
      <section id="how-it-works" style={{
        padding: '80px 24px', maxWidth: 1000, margin: '0 auto'
      }}>
        <h2 style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 700, marginBottom: 60 }}>
          How It Works
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 32 }}>
          {[
            {
              step: '01',
              title: 'Create Your QR',
              desc: 'Design custom QR codes that match your brand. Upload your colors, logo, and style. No ugly black-and-white squares.'
            },
            {
              step: '02',
              title: 'Attach Your Content',
              desc: 'Link tutorials, videos, marketing offers, or product details to each code. Update content anytime without reprinting.'
            },
            {
              step: '03',
              title: 'Capture the Data',
              desc: 'Every scan captures geographic location, device info, and timestamp. Build your VIP member list with direct phone outreach.'
            },
          ].map(item => (
            <div key={item.step} className="card" style={{ position: 'relative', paddingTop: 48 }}>
              <div style={{
                position: 'absolute', top: -16, left: 24,
                background: '#FAFAFA', color: '#09090B',
                padding: '6px 14px', borderRadius: 8,
                fontWeight: 700, fontSize: '0.85rem'
              }}>{item.step}</div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 12 }}>{item.title}</h3>
              <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{
        padding: '80px 24px', maxWidth: 1000, margin: '0 auto'
      }}>
        <h2 style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 700, marginBottom: 60 }}>
          What Brands Get
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
          {[
            { icon: '📍', title: 'Geo-Location Data', desc: 'See exactly where consumers are scanning your products, down to the city.' },
            { icon: '📱', title: 'Custom QR Codes', desc: 'Branded codes that blend seamlessly into packaging and product design.' },
            { icon: '🎯', title: 'Product Content', desc: 'Tutorials, videos, offers. Specific to each product. Updated in real time.' },
            { icon: '👑', title: 'VIP Member List', desc: 'Collect first name, last name, and phone number. Your direct engagement channel.' },
            { icon: '📊', title: 'Scan Analytics', desc: 'Track scans over time, by location, by product. Know what is working.' },
            { icon: '🔗', title: 'No App Required', desc: 'Consumers just scan and go. Zero friction, browser-based experience.' },
          ].map(f => (
            <div key={f.title} className="card" style={{ textAlign: 'center', padding: 28 }}>
              <div style={{ fontSize: '2rem', marginBottom: 12 }}>{f.icon}</div>
              <h4 style={{ fontWeight: 600, marginBottom: 8 }}>{f.title}</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{
        padding: '80px 24px', textAlign: 'center'
      }}>
        <div className="card" style={{
          maxWidth: 700, margin: '0 auto', padding: '60px 40px',
          background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(255, 255, 255, 0.03) 100%)',
          border: '1px solid #3F3F46'
        }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: 16 }}>
            Ready to capture your audience?
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 32, fontSize: '1.1rem' }}>
            Start connecting with every customer who touches your product.
          </p>
          <Link to="/login?signup=true" className="btn btn-primary" style={{ padding: '16px 40px', fontSize: '1.05rem' }}>
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        textAlign: 'center', padding: '40px 24px',
        color: 'var(--text-muted)', fontSize: '0.85rem',
        borderTop: '1px solid var(--border)',
        display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap',
      }}>
        <span>&copy; 2026 Captura</span>
        <Link to="/terms" style={{ color: 'var(--text-muted)' }}>Terms</Link>
        <Link to="/privacy" style={{ color: 'var(--text-muted)' }}>Privacy</Link>
      </footer>
    </div>
  )
}
