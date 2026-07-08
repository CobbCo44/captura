import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <div style={{ minHeight: '100vh', overflow: 'hidden' }}>
      {/* Nav */}
      <nav style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '20px 40px', maxWidth: 1200, margin: '0 auto',
      }}>
        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FAFAFA', letterSpacing: '-0.5px' }}>
          Captura
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link to="/login" style={{
            padding: '10px 20px', fontSize: '0.9rem', color: '#A1A1AA',
            fontWeight: 500,
          }}>Log In</Link>
          <Link to="/login?signup=true" style={{
            padding: '10px 24px', fontSize: '0.9rem', color: '#09090B',
            fontWeight: 600, background: '#FAFAFA', borderRadius: 8,
          }}>Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{
        padding: '120px 40px 80px', maxWidth: 1200, margin: '0 auto',
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center',
      }}>
        <div>
          <h1 style={{
            fontSize: 'clamp(3rem, 5.5vw, 4.5rem)', fontWeight: 800,
            lineHeight: 1.05, letterSpacing: '-2px', color: '#FAFAFA',
            marginBottom: 28,
          }}>
            Your product.<br />
            Their phone.<br />
            Your data.
          </h1>
          <p style={{
            fontSize: '1.15rem', color: '#71717A', lineHeight: 1.7,
            maxWidth: 440, marginBottom: 36,
          }}>
            Captura turns physical products into data collection points. One QR code scan gives you the consumer's location, contact info, and a direct channel to reach them again.
          </p>
          <div style={{ display: 'flex', gap: 14 }}>
            <Link to="/login?signup=true" style={{
              padding: '16px 36px', fontSize: '1rem', color: '#09090B',
              fontWeight: 700, background: '#FAFAFA', borderRadius: 10,
              letterSpacing: '-0.3px',
            }}>Start Free</Link>
            <a href="#how" style={{
              padding: '16px 36px', fontSize: '1rem', color: '#71717A',
              fontWeight: 600, borderRadius: 10, border: '1px solid #27272A',
            }}>Learn More</a>
          </div>
        </div>

        {/* Visual: Simulated scan flow */}
        <div style={{ position: 'relative' }}>
          <div style={{
            background: '#131316', border: '1px solid #27272A', borderRadius: 20,
            padding: '40px 32px', position: 'relative', overflow: 'hidden',
          }}>
            {/* Scan event cards */}
            {[
              { city: 'Houston, TX', product: 'Batting Gloves', time: '2s ago', type: 'Scan' },
              { city: 'Miami, FL', product: 'Training Bat', time: '14s ago', type: 'VIP Signup' },
              { city: 'Denver, CO', product: 'Batting Gloves', time: '31s ago', type: 'Promo Entry' },
              { city: 'Austin, TX', product: 'Fielding Glove', time: '1m ago', type: 'Scan' },
              { city: 'Chicago, IL', product: 'Training Bat', time: '2m ago', type: 'VIP Signup' },
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '14px 0',
                borderBottom: i < 4 ? '1px solid #1C1C21' : 'none',
                opacity: 1 - (i * 0.12),
              }}>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 500, color: '#FAFAFA' }}>{item.product}</div>
                  <div style={{ fontSize: '0.75rem', color: '#52525B' }}>{item.city}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    fontSize: '0.7rem', fontWeight: 600,
                    color: item.type === 'VIP Signup' ? '#22C55E' : item.type === 'Promo Entry' ? '#F59E0B' : '#71717A',
                  }}>{item.type}</div>
                  <div style={{ fontSize: '0.7rem', color: '#3F3F46' }}>{item.time}</div>
                </div>
              </div>
            ))}
            {/* Glow effect */}
            <div style={{
              position: 'absolute', top: -40, right: -40, width: 120, height: 120,
              background: 'radial-gradient(circle, rgba(250,250,250,0.03) 0%, transparent 70%)',
              borderRadius: '50%',
            }} />
          </div>
        </div>
      </section>

      {/* Logos / Trust bar */}
      <section style={{
        padding: '40px 40px 60px', maxWidth: 1200, margin: '0 auto',
        borderTop: '1px solid #1C1C21',
      }}>
        <div style={{ fontSize: '0.75rem', color: '#3F3F46', textAlign: 'center', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 20 }}>
          Built for brands in
        </div>
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 40, flexWrap: 'wrap',
          color: '#3F3F46', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '1px',
        }}>
          {['SPORTING GOODS', 'APPAREL', 'CPG', 'FOOD & BEV', 'BEAUTY', 'ELECTRONICS'].map(ind => (
            <span key={ind}>{ind}</span>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" style={{
        padding: '100px 40px', maxWidth: 1200, margin: '0 auto',
      }}>
        <div style={{ maxWidth: 500, marginBottom: 60 }}>
          <div style={{ fontSize: '0.8rem', color: '#3F3F46', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12 }}>
            How it works
          </div>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-1px', color: '#FAFAFA' }}>
            Three steps between your product and your customer's phone
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
          {[
            {
              num: '01',
              title: 'Build',
              desc: 'Create a product profile. Add images, descriptions, videos, and marketing content. Generate a custom QR code with your brand colors and logo.',
            },
            {
              num: '02',
              title: 'Deploy',
              desc: 'Put the QR code on your product, packaging, display, or marketing material. Print it, sticker it, engrave it. Wherever your product goes, the code goes.',
            },
            {
              num: '03',
              title: 'Capture',
              desc: 'Every scan logs the consumer's location and device. They see your product content and get prompted to join your VIP list. You get their name, phone, and email.',
            },
          ].map((item, i) => (
            <div key={item.num} style={{
              padding: '40px 36px',
              background: '#131316',
              borderLeft: i > 0 ? '1px solid #1C1C21' : 'none',
            }}>
              <div style={{
                fontSize: '3rem', fontWeight: 800, color: '#1C1C21',
                lineHeight: 1, marginBottom: 20,
              }}>{item.num}</div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 12, color: '#FAFAFA' }}>{item.title}</h3>
              <p style={{ color: '#52525B', lineHeight: 1.7, fontSize: '0.9rem' }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Value props - asymmetric */}
      <section style={{
        padding: '100px 40px', maxWidth: 1200, margin: '0 auto',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60 }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#3F3F46', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12 }}>
              What you get
            </div>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-1px', color: '#FAFAFA', marginBottom: 40 }}>
              First-party data from every product touchpoint
            </h2>

            {[
              { title: 'Geographic Intelligence', desc: 'See exactly where your products are being scanned. City-level location data on every interaction.' },
              { title: 'Consumer Profiles', desc: 'Name, phone, email. Collected voluntarily through VIP signup and promo entry. Your direct channel.' },
              { title: 'Engagement Analytics', desc: 'Scan counts by SKU, conversion rates, trend lines. Know what products are moving and where.' },
              { title: 'Promotional Campaigns', desc: 'Run enter-to-win campaigns across all your QR codes with one toggle. Collect entries with full contact data.' },
            ].map((item, i) => (
              <div key={i} style={{
                padding: '20px 0',
                borderBottom: '1px solid #1C1C21',
              }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#FAFAFA', marginBottom: 6 }}>{item.title}</h4>
                <p style={{ color: '#52525B', fontSize: '0.9rem', lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            ))}
          </div>

          <div style={{
            background: '#131316', border: '1px solid #1C1C21', borderRadius: 16,
            padding: '40px', display: 'flex', flexDirection: 'column', justifyContent: 'center',
          }}>
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: '0.7rem', color: '#3F3F46', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 8 }}>
                Live metrics
              </div>
              {[
                { label: 'Total Scans', value: '12,847' },
                { label: 'VIP Members', value: '2,341' },
                { label: 'Conversion Rate', value: '18.2%' },
                { label: 'Active Cities', value: '127' },
              ].map((m, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                  padding: '16px 0', borderBottom: '1px solid #1C1C21',
                }}>
                  <span style={{ color: '#52525B', fontSize: '0.9rem' }}>{m.label}</span>
                  <span style={{ color: '#FAFAFA', fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.5px' }}>{m.value}</span>
                </div>
              ))}
            </div>

            {/* Mini bar chart */}
            <div>
              <div style={{ fontSize: '0.7rem', color: '#3F3F46', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 12 }}>
                Scans this week
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 60 }}>
                {[35, 52, 41, 68, 55, 72, 48].map((h, i) => (
                  <div key={i} style={{
                    flex: 1, height: `${h}%`, borderRadius: 3,
                    background: i === 5 ? '#FAFAFA' : '#27272A',
                  }} />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                  <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: '0.6rem', color: '#3F3F46' }}>{d}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '100px 40px 120px', textAlign: 'center' }}>
        <h2 style={{
          fontSize: 'clamp(2rem, 4vw, 3.5rem)', fontWeight: 800,
          lineHeight: 1.1, letterSpacing: '-1.5px', color: '#FAFAFA',
          marginBottom: 20, maxWidth: 600, margin: '0 auto 20px',
        }}>
          Stop guessing who's buying your product
        </h2>
        <p style={{
          color: '#52525B', fontSize: '1.1rem', marginBottom: 40,
          maxWidth: 460, margin: '0 auto 40px',
        }}>
          Every product you sell is a chance to capture a customer. Start collecting.
        </p>
        <Link to="/login?signup=true" style={{
          display: 'inline-block', padding: '18px 48px', fontSize: '1.05rem',
          color: '#09090B', fontWeight: 700, background: '#FAFAFA', borderRadius: 10,
          letterSpacing: '-0.3px',
        }}>Get Started Free</Link>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '32px 40px', borderTop: '1px solid #1C1C21',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        maxWidth: 1200, margin: '0 auto', flexWrap: 'wrap', gap: 16,
      }}>
        <span style={{ color: '#27272A', fontSize: '0.85rem' }}>&copy; 2026 Captura</span>
        <div style={{ display: 'flex', gap: 24 }}>
          <Link to="/terms" style={{ color: '#3F3F46', fontSize: '0.85rem' }}>Terms</Link>
          <Link to="/privacy" style={{ color: '#3F3F46', fontSize: '0.85rem' }}>Privacy</Link>
        </div>
      </footer>

      {/* Mobile responsive */}
      <style>{`
        @media (max-width: 768px) {
          section { padding-left: 20px !important; padding-right: 20px !important; }
          section[style*="grid-template-columns: 1fr 1fr"],
          section > div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
            gap: 40px !important;
          }
          section > div[style*="grid-template-columns: repeat(3"] {
            grid-template-columns: 1fr !important;
          }
          section > div[style*="grid-template-columns: repeat(3"] > div {
            border-left: none !important;
            border-bottom: 1px solid #1C1C21;
          }
          nav { padding: 16px 20px !important; }
          footer { padding: 24px 20px !important; }
        }
      `}</style>
    </div>
  )
}
