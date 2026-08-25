import { Link } from 'react-router-dom'

const STEPS = [
  {
    n: '01',
    title: 'Put the code on the counter.',
    desc: 'Customers scan to see your menu, hours, and rewards. No app, no punch card, no signup kiosk.',
  },
  {
    n: '02',
    title: 'Your list builds itself.',
    desc: 'Every customer who joins your loyalty program becomes a contact you own, with their consent, captured at the counter.',
  },
  {
    n: '03',
    title: 'Autopilot brings them back.',
    desc: 'The system welcomes new members, tells them when they have earned a reward, and reaches out when a regular has not been in for a while. Automatically.',
  },
]

const AUTOPILOT_EMAILS = [
  {
    title: 'Welcome',
    desc: 'New members get a friendly "here’s how it works" the moment they join.',
  },
  {
    title: 'Reward Ready',
    desc: 'The instant someone earns a free item, they know. That email is a return visit waiting to happen.',
  },
  {
    title: 'Win-Back',
    desc: 'When a regular has not been in for 30 days, the system reaches out: "your points are waiting." The highest-value email in retail, and you never write it.',
  },
]

const STOREFRONT_PIECES = [
  'Menu and prices',
  'Hours and locations',
  'Booking or online ordering link, front and center',
  'Upcoming events',
  'Current giveaway',
  'Loyalty points and rewards',
]

const TIERS = [
  {
    tier: 'Starter',
    price: '$99',
    desc: 'The loyalty loop, running itself: scan page, menu, rewards, welcome and reward alerts.',
  },
  {
    tier: 'Growth',
    price: '$299',
    badge: 'Most popular',
    desc: 'Everything in Starter plus Win-Back, announcements, and the dashboard that shows how many customers Autopilot brought back.',
  },
  {
    tier: 'Pro',
    price: '$499',
    desc: 'Everything in Growth for up to five locations, $89 per additional location.',
  },
]

const eyebrow = {
  fontSize: '0.75rem', color: '#3F3F46', fontWeight: 600, letterSpacing: '3px',
  textTransform: 'uppercase', marginBottom: 20,
}

const h2 = {
  fontSize: 'clamp(1.9rem, 3.6vw, 2.6rem)', fontWeight: 800, lineHeight: 1.1,
  letterSpacing: '-1px', color: '#FAFAFA', marginBottom: 24,
}

const body = {
  fontSize: '1.05rem', color: '#71717A', lineHeight: 1.75,
}

const sectionBase = {
  padding: '100px 40px', maxWidth: 1200, margin: '0 auto',
  borderTop: '1px solid #1C1C21',
}

export default function Storefronts() {
  return (
    <div style={{ minHeight: '100vh', overflowX: 'hidden' }}>
      {/* Nav */}
      <nav style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '20px 40px', maxWidth: 1200, margin: '0 auto',
      }}>
        <Link to="/">
          <img src="/images/meetcaptura-logo.png" alt="MeetCaptura" style={{ height: 56, filter: 'invert(1)' }} />
        </Link>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link to="/storefronts" style={{
            padding: '10px 20px', fontSize: '0.9rem', color: '#FAFAFA', fontWeight: 600,
          }}>For Storefronts</Link>
          <Link to="/login" style={{
            padding: '10px 20px', fontSize: '0.9rem', color: '#A1A1AA', fontWeight: 500,
          }}>Log In</Link>
          <Link to="/login?signup=true" style={{
            padding: '10px 24px', fontSize: '0.9rem', color: '#09090B',
            fontWeight: 600, background: '#FAFAFA', borderRadius: 8,
          }}>Get Started</Link>
        </div>
      </nav>

      {/* 1. Hero */}
      <section style={{
        padding: '120px 40px 90px', maxWidth: 820, margin: '0 auto', textAlign: 'center',
      }}>
        <div style={eyebrow}>For Storefronts</div>
        <h1 style={{
          fontSize: 'clamp(2.4rem, 5vw, 3.8rem)', fontWeight: 800,
          lineHeight: 1.05, letterSpacing: '-2px', color: '#FAFAFA',
          marginBottom: 28,
        }}>
          Your marketing runs itself.
        </h1>
        <p style={{
          ...body, fontSize: '1.15rem', maxWidth: 640, margin: '0 auto 40px',
        }}>
          One QR at your counter builds a customer list you own, then puts it to work automatically.
          Welcome emails, reward alerts, and win-back messages go out on their own. You just run your shop.
        </p>
        <div className="sf-cta-row">
          <Link to="/login?signup=true" style={{
            display: 'inline-block', padding: '17px 44px', fontSize: '1.05rem',
            color: '#09090B', fontWeight: 700, background: '#FAFAFA', borderRadius: 10,
          }}>Get Started</Link>
          <a
            href="#how-it-works"
            onClick={(e) => {
              e.preventDefault()
              document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })
            }}
            style={{
            display: 'inline-block', padding: '17px 40px', fontSize: '1.05rem',
            color: '#FAFAFA', fontWeight: 600, background: 'transparent',
            border: '1px solid #27272A', borderRadius: 10,
          }}>See how it works</a>
        </div>
      </section>

      {/* 2. How it works */}
      <section id="how-it-works" style={sectionBase}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={eyebrow}>How it works</div>
          <h2 style={{ ...h2, marginBottom: 0 }}>Three steps, then it runs.</h2>
        </div>

        <div className="sf-grid-3" style={{ display: 'grid', gap: 2 }}>
          {STEPS.map((s, i) => (
            <div key={s.n} style={{
              padding: '40px 32px', background: '#131316',
              borderRight: i < STEPS.length - 1 ? '1px solid #1C1C21' : 'none',
            }}>
              <div style={{
                fontSize: '0.8rem', color: '#3F3F46', fontWeight: 700,
                letterSpacing: '2px', marginBottom: 18,
              }}>{s.n}</div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#FAFAFA', marginBottom: 12 }}>
                {s.title}
              </h3>
              <p style={{ color: '#52525B', lineHeight: 1.75, fontSize: '0.95rem' }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Autopilot */}
      <section style={sectionBase}>
        <div className="sf-split" style={{ display: 'grid', gap: 72, alignItems: 'start' }}>
          <div>
            <div style={eyebrow}>Autopilot</div>
            <h2 style={h2}>The email marketing you&rsquo;d never have time to do. Done.</h2>
            <p style={{ ...body, marginBottom: 36 }}>
              Most shops know they should stay in touch with customers. Nobody has time to become an
              email marketer. So MeetCaptura does it for you, with three messages that send themselves:
            </p>

            {AUTOPILOT_EMAILS.map((e, i) => (
              <div key={e.title} style={{
                padding: '22px 0',
                borderTop: '1px solid #1C1C21',
                borderBottom: i === AUTOPILOT_EMAILS.length - 1 ? '1px solid #1C1C21' : 'none',
              }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#FAFAFA', marginBottom: 8 }}>
                  {e.title}
                </h4>
                <p style={{ color: '#52525B', fontSize: '0.95rem', lineHeight: 1.75 }}>{e.desc}</p>
              </div>
            ))}
          </div>

          {/* Autopilot proof mockup */}
          <div style={{
            background: '#131316', border: '1px solid #1C1C21', borderRadius: 16,
            padding: '36px', display: 'flex', flexDirection: 'column', justifyContent: 'center',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
              <div style={{
                fontSize: '0.7rem', color: '#3F3F46', fontWeight: 600,
                letterSpacing: '1px', textTransform: 'uppercase',
              }}>Autopilot this month</div>
              <div style={{ fontSize: '0.6rem', color: '#27272A', fontStyle: 'italic' }}>Illustrative dashboard</div>
            </div>

            <div style={{
              fontSize: 'clamp(3rem, 7vw, 4.2rem)', fontWeight: 800, color: '#FAFAFA',
              letterSpacing: '-3px', lineHeight: 1, marginBottom: 12,
            }}>27</div>
            <p style={{ color: '#A1A1AA', fontSize: '1rem', lineHeight: 1.6, marginBottom: 32 }}>
              Autopilot brought back 27 customers this month.
            </p>

            {[
              { label: 'Welcome', status: 'Sending' },
              { label: 'Reward Ready', status: 'Sending' },
              { label: 'Win-Back', status: 'Sending' },
            ].map((row, i) => (
              <div key={row.label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '14px 0',
                borderTop: '1px solid #1C1C21',
                borderBottom: i === 2 ? '1px solid #1C1C21' : 'none',
              }}>
                <span style={{ color: '#A1A1AA', fontSize: '0.9rem' }}>{row.label}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#52525B', fontSize: '0.8rem' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22C55E', display: 'inline-block' }} />
                  {row.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Announcements */}
      <section style={sectionBase}>
        <div style={{ maxWidth: 780 }}>
          <div style={eyebrow}>Announcements</div>
          <h2 style={h2}>Got something to say? Say it to your actual customers.</h2>
          <p style={body}>
            New fall menu. Flash sale. Closing early Friday. You post it to social media and hope the
            algorithm shows someone. Now you can send it straight to the people who already love your
            shop, as easily as posting a story: type it, hit send, done. We even keep the guardrails on
            for you, capped at four announcements a month, so your customers stay glad to hear from you.
          </p>
        </div>
      </section>

      {/* 5. One scan, whole storefront */}
      <section style={sectionBase}>
        <div className="sf-split" style={{ display: 'grid', gap: 72, alignItems: 'center' }}>
          <div>
            <div style={eyebrow}>One scan, whole storefront</div>
            <h2 style={h2}>Everything a customer needs, one scan away.</h2>
            <p style={body}>
              Menu and prices. Hours and locations. Your booking or online ordering link, front and
              center. Upcoming events. Current giveaway. Loyalty points and rewards. One code on the
              counter carries your whole storefront, and you control exactly which pieces show.
            </p>
          </div>

          <div className="sf-grid-2" style={{ display: 'grid', gap: 2 }}>
            {STOREFRONT_PIECES.map((piece, i) => (
              <div key={piece} style={{
                padding: '26px 22px', background: '#131316',
                color: '#A1A1AA', fontSize: '0.9rem', lineHeight: 1.6, fontWeight: 500,
                display: 'flex', alignItems: 'center',
                borderRight: i % 2 === 0 ? '1px solid #1C1C21' : 'none',
                borderBottom: i < STOREFRONT_PIECES.length - 2 ? '1px solid #1C1C21' : 'none',
              }}>{piece}</div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Pricing */}
      <section style={sectionBase}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={eyebrow}>Pricing</div>
          <h2 style={{ ...h2, marginBottom: 0 }}>Pick your speed.</h2>
        </div>

        <div className="sf-grid-3" style={{ display: 'grid', gap: 2 }}>
          {TIERS.map((t, i) => (
            <div key={t.tier} style={{
              padding: '44px 32px', background: t.badge ? '#17171B' : '#131316',
              borderRight: i < TIERS.length - 1 ? '1px solid #1C1C21' : 'none',
              textAlign: 'center', position: 'relative',
            }}>
              {t.badge && (
                <div style={{
                  position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
                  fontSize: '0.65rem', fontWeight: 700, letterSpacing: '1.5px',
                  textTransform: 'uppercase', color: '#09090B', background: '#FAFAFA',
                  padding: '5px 12px', borderRadius: 999, whiteSpace: 'nowrap',
                }}>{t.badge}</div>
              )}
              <div style={{
                fontSize: '0.8rem', color: '#3F3F46', fontWeight: 600, letterSpacing: '2px',
                textTransform: 'uppercase', marginBottom: 12, marginTop: t.badge ? 18 : 0,
              }}>{t.tier}</div>
              <div style={{
                fontSize: '2.5rem', fontWeight: 800, color: '#FAFAFA',
                letterSpacing: '-1px', marginBottom: 14,
              }}>
                {t.price}<span style={{ fontSize: '1rem', fontWeight: 500, color: '#52525B' }}>/mo</span>
              </div>
              <p style={{ color: '#52525B', fontSize: '0.9rem', lineHeight: 1.7 }}>{t.desc}</p>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 28 }}>
          <p style={{ color: '#71717A', fontSize: '0.95rem', lineHeight: 1.7, marginBottom: 10 }}>
            $199 setup. Waived for our founding storefronts, with your rate locked for twelve months.
          </p>
          <p style={{ color: '#3F3F46', fontSize: '0.85rem', lineHeight: 1.7, maxWidth: 560, margin: '0 auto' }}>
            At a $10 average ticket, one extra customer a day covers Growth. Most shops get that from
            the win-back email alone.
          </p>
        </div>
      </section>

      {/* 7. Closer */}
      <section style={{ padding: '100px 40px 130px', textAlign: 'center', borderTop: '1px solid #1C1C21' }}>
        <h2 style={{
          fontSize: 'clamp(1.9rem, 3.6vw, 2.8rem)', fontWeight: 800,
          lineHeight: 1.1, letterSpacing: '-1.5px', color: '#FAFAFA',
          maxWidth: 620, margin: '0 auto 22px',
        }}>
          Your regulars are loyal. Now you can reach them.
        </h2>
        <p style={{
          color: '#71717A', fontSize: '1.05rem',
          maxWidth: 520, margin: '0 auto 40px', lineHeight: 1.75,
        }}>
          Right now, when Tuesday&rsquo;s slow, there&rsquo;s nothing you can do about it.
          With MeetCaptura, there is.
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
        <span style={{ color: '#27272A', fontSize: '0.85rem' }}>&copy; 2026 MeetCaptura</span>
        <div style={{ display: 'flex', gap: 24 }}>
          <Link to="/terms" style={{ color: '#3F3F46', fontSize: '0.85rem' }}>Terms</Link>
          <Link to="/privacy" style={{ color: '#3F3F46', fontSize: '0.85rem' }}>Privacy</Link>
        </div>
      </footer>

      <style>{`
        html { scroll-behavior: smooth; }
        #how-it-works { scroll-margin-top: 24px; }
        .sf-grid-3 { grid-template-columns: repeat(3, 1fr); }
        .sf-grid-2 { grid-template-columns: repeat(2, 1fr); }
        .sf-split { grid-template-columns: 1fr 1fr; }
        .sf-cta-row {
          display: flex; gap: 14px; justify-content: center;
          align-items: center; flex-wrap: wrap;
        }
        @media (max-width: 900px) {
          .sf-split { grid-template-columns: 1fr !important; gap: 48px !important; }
        }
        @media (max-width: 768px) {
          section { padding-left: 20px !important; padding-right: 20px !important; }
          .sf-grid-3 { grid-template-columns: 1fr !important; }
          .sf-grid-3 > div { border-right: none !important; border-bottom: 1px solid #1C1C21; }
          .sf-grid-3 > div:last-child { border-bottom: none; }
          .sf-grid-2 > div { border-right: none !important; border-bottom: 1px solid #1C1C21 !important; }
          .sf-grid-2 > div:last-child { border-bottom: none !important; }
          .sf-cta-row a { width: 100%; text-align: center; }
          nav { padding: 16px 20px !important; }
          nav img { height: 42px !important; }
          nav a { padding: 8px 12px !important; font-size: 0.82rem !important; }
          footer { padding: 24px 20px !important; }
        }
        @media (max-width: 560px) {
          .sf-grid-2 { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
