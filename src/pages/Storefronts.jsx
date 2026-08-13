import { Link } from 'react-router-dom'

export default function Storefronts() {
  return (
    <div style={{ minHeight: '100vh', overflow: 'hidden' }}>
      {/* Nav */}
      <nav style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '20px 40px', maxWidth: 1200, margin: '0 auto',
      }}>
        <Link to="/">
          <img src="/images/meetcaptura-logo.png" alt="meetcaptura" style={{ height: 56, filter: 'invert(1)' }} />
        </Link>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link to="/storefronts" style={{
            padding: '10px 20px', fontSize: '0.9rem', color: '#FAFAFA', fontWeight: 600,
          }}>For Storefronts</Link>
          <Link to="/login" style={{
            padding: '10px 20px', fontSize: '0.9rem', color: '#A1A1AA', fontWeight: 500,
          }}>Log In</Link>
          <Link to="/login?signup=true" style={{
            padding: '10px 24px', fontSize: '0.9rem', color: '#09090B',
            fontWeight: 600, background: '#FAFAFA', borderRadius: 8,
          }}>Request Demo</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{
        padding: '120px 40px 80px', maxWidth: 800, margin: '0 auto', textAlign: 'center',
      }}>
        <div style={{
          fontSize: '0.75rem', color: '#3F3F46', fontWeight: 600, letterSpacing: '3px',
          textTransform: 'uppercase', marginBottom: 20,
        }}>For Storefronts</div>
        <h1 style={{
          fontSize: 'clamp(2.4rem, 5vw, 3.8rem)', fontWeight: 800,
          lineHeight: 1.05, letterSpacing: '-2px', color: '#FAFAFA',
          marginBottom: 28,
        }}>
          Your regulars, on a list you own.
        </h1>
        <p style={{
          fontSize: '1.15rem', color: '#71717A', lineHeight: 1.7,
          maxWidth: 600, margin: '0 auto 20px',
        }}>
          One QR at the counter gives customers your menu or services, hours, locations, and current promo, and gives you what the register never will: their contact, with their consent. Customers join your loyalty program in one tap, earn a point per visit, and redeem rewards you define.
        </p>
      </section>

      {/* Features */}
      <section style={{
        padding: '0 40px 100px', maxWidth: 1200, margin: '0 auto',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
          {[
            { title: 'Menu and services page', desc: 'Your full menu or service list, always up to date, right from the scan.' },
            { title: 'Store hours and locations', desc: 'Multiple locations with hours, directions, and maps. Customers always know where to find you.' },
            { title: 'Giveaways and promos', desc: 'Run seasonal giveaways, flash deals, or referral rewards. Capture contacts with every entry.' },
            { title: 'One-tap loyalty', desc: 'Customers earn a point per visit. No punch card, no app download, no login. Just scan and earn.' },
            { title: 'Embedded video', desc: 'Feature your brand story, product demos, or how-to content right on the scan page.' },
          ].map((item, i) => (
            <div key={i} style={{
              padding: '36px 28px', background: '#131316',
              borderRight: i < 2 || (i > 2 && i < 4) ? '1px solid #1C1C21' : 'none',
              borderBottom: i < 3 ? '1px solid #1C1C21' : 'none',
            }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 10, color: '#FAFAFA' }}>{item.title}</h3>
              <p style={{ color: '#52525B', lineHeight: 1.7, fontSize: '0.9rem' }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section style={{
        padding: '100px 40px', maxWidth: 1200, margin: '0 auto',
        borderTop: '1px solid #1C1C21',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <div style={{ fontSize: '0.75rem', color: '#3F3F46', fontWeight: 600, letterSpacing: '3px', textTransform: 'uppercase', marginBottom: 16 }}>
            Pricing
          </div>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-1px', color: '#FAFAFA' }}>
            Simple, flat monthly pricing
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
          {[
            {
              tier: 'Starter',
              price: '$99',
              desc: 'One location, core features, loyalty, and giveaways.',
            },
            {
              tier: 'Growth',
              price: '$249',
              desc: 'Up to five locations, embedded video, advanced promos.',
            },
            {
              tier: 'Pro',
              price: '$499',
              desc: 'Unlimited features, priority support, custom integrations.',
            },
          ].map((item, i) => (
            <div key={i} style={{
              padding: '44px 36px', background: '#131316',
              borderRight: i < 2 ? '1px solid #1C1C21' : 'none',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '0.8rem', color: '#3F3F46', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12 }}>
                {item.tier}
              </div>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#FAFAFA', letterSpacing: '-1px', marginBottom: 8 }}>
                {item.price}<span style={{ fontSize: '1rem', fontWeight: 500, color: '#52525B' }}>/mo</span>
              </div>
              <p style={{ color: '#52525B', fontSize: '0.9rem', lineHeight: 1.6 }}>{item.desc}</p>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, color: '#3F3F46', fontSize: '0.85rem' }}>
          Additional locations $89/mo past five.
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 40px 120px', textAlign: 'center' }}>
        <h2 style={{
          fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', fontWeight: 800,
          lineHeight: 1.1, letterSpacing: '-1.5px', color: '#FAFAFA',
          maxWidth: 550, margin: '0 auto 20px',
        }}>
          Turn foot traffic into a contact list.
        </h2>
        <p style={{
          color: '#52525B', fontSize: '1.05rem',
          maxWidth: 440, margin: '0 auto 40px', lineHeight: 1.7,
        }}>
          Set up in minutes. One QR does the rest.
        </p>
        <Link to="/login?signup=true" style={{
          display: 'inline-block', padding: '18px 48px', fontSize: '1.05rem',
          color: '#09090B', fontWeight: 700, background: '#FAFAFA', borderRadius: 10,
        }}>Get Started</Link>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '32px 40px', borderTop: '1px solid #1C1C21',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        maxWidth: 1200, margin: '0 auto', flexWrap: 'wrap', gap: 16,
      }}>
        <span style={{ color: '#27272A', fontSize: '0.85rem' }}>&copy; 2026 meetcaptura</span>
        <div style={{ display: 'flex', gap: 24 }}>
          <Link to="/terms" style={{ color: '#3F3F46', fontSize: '0.85rem' }}>Terms</Link>
          <Link to="/privacy" style={{ color: '#3F3F46', fontSize: '0.85rem' }}>Privacy</Link>
        </div>
      </footer>

      <style>{`
        @media (max-width: 768px) {
          section { padding-left: 20px !important; padding-right: 20px !important; }
          section > div[style*="grid-template-columns: repeat(3"] {
            grid-template-columns: 1fr !important;
          }
          section > div[style*="grid-template-columns: repeat"] > div {
            border-right: none !important;
          }
          nav { padding: 16px 20px !important; }
          footer { padding: 24px 20px !important; }
        }
      `}</style>
    </div>
  )
}
