import { Link } from 'react-router-dom'
import { useEffect, useRef } from 'react'

function useSEO({ title, description, canonical }) {
  useEffect(() => {
    document.title = title
    const setMeta = (name, content) => {
      let el = document.querySelector(`meta[name="${name}"]`)
      if (!el) { el = document.createElement('meta'); el.name = name; document.head.appendChild(el) }
      el.content = content
    }
    setMeta('description', description)
    let link = document.querySelector('link[rel="canonical"]')
    if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link) }
    link.href = canonical
    return () => { document.title = 'Captura' }
  }, [title, description, canonical])
}

/* Fade-in on scroll */
function useFadeIn() {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { el.style.opacity = 1; el.style.transform = 'translateY(0)'; obs.unobserve(el) }
    }, { threshold: 0.12 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return ref
}

function FadeSection({ children, style, ...rest }) {
  const ref = useFadeIn()
  return (
    <section ref={ref} style={{ opacity: 0, transform: 'translateY(24px)', transition: 'opacity 0.6s ease, transform 0.6s ease', ...style }} {...rest}>
      {children}
    </section>
  )
}

/* Colors */
const C = {
  heading: '#F4F5F7',
  body: '#C9CDD4',
  muted: '#B0B4BB',
  caption: '#7A7F8A',
  accent: '#FACC15',
  border: '#23262D',
  cardBg: '#111318',
  bg: '#09090B',
}

/* Hero image */
function HeroQR() {
  return (
    <div style={{ width: '100%', maxWidth: 420, margin: '0 auto' }}>
      <img
        src="/images/hero-qr-box.png"
        alt="Product packaging with a branded Captura QR code"
        style={{ width: '100%', height: 'auto', borderRadius: 16, display: 'block' }}
      />
    </div>
  )
}

/* Two-arrow diagram for "One code, two jobs" */
function TwoJobsDiagram() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0,
      padding: '40px 0',
    }}>
      {/* Top branch: POS */}
      <div className="gs1-diagram-branch" style={{
        display: 'flex', alignItems: 'center', gap: 16, width: '100%', maxWidth: 520,
      }}>
        <div style={{
          flex: '0 0 auto', width: 44, height: 44, borderRadius: 10,
          background: C.cardBg, border: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.caption} strokeWidth="2" strokeLinecap="round">
            <rect x="2" y="4" width="20" height="16" rx="2"/>
            <line x1="2" y1="10" x2="22" y2="10"/>
          </svg>
        </div>
        <svg width="40" height="2" style={{ flexShrink: 0 }}><line x1="0" y1="1" x2="40" y2="1" stroke={C.accent} strokeWidth="2" strokeDasharray="4 3"/></svg>
        <div style={{ flex: 1, padding: '14px 18px', background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 10 }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: C.heading, marginBottom: 2 }}>Brand's GS1 code</div>
          <div style={{ fontSize: '0.75rem', color: C.caption, lineHeight: 1.4 }}>Rings up at POS</div>
        </div>
      </div>

      {/* Center code icon */}
      <div style={{
        width: 56, height: 56, borderRadius: 14, margin: '20px 0',
        background: C.cardBg, border: `2px solid ${C.accent}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', zIndex: 1,
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="7" height="7" rx="1" fill={C.accent}/>
          <rect x="14" y="3" width="7" height="7" rx="1" fill={C.accent}/>
          <rect x="3" y="14" width="7" height="7" rx="1" fill={C.accent}/>
          <rect x="14" y="14" width="4" height="4" rx="1" fill={C.accent}/>
          <rect x="19" y="17" width="2" height="4" rx="0.5" fill={C.accent}/>
          <rect x="14" y="19" width="4" height="2" rx="0.5" fill={C.accent}/>
        </svg>
      </div>

      {/* Bottom branch: Captura experience */}
      <div className="gs1-diagram-branch" style={{
        display: 'flex', alignItems: 'center', gap: 16, width: '100%', maxWidth: 520,
      }}>
        <div style={{
          flex: '0 0 auto', width: 44, height: 44, borderRadius: 10,
          background: C.cardBg, border: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="18" height="20" viewBox="0 0 18 24" fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round">
            <rect x="2" y="1" width="14" height="22" rx="3"/>
            <line x1="7" y1="19" x2="11" y2="19"/>
          </svg>
        </div>
        <svg width="40" height="2" style={{ flexShrink: 0 }}><line x1="0" y1="1" x2="40" y2="1" stroke={C.accent} strokeWidth="2" strokeDasharray="4 3"/></svg>
        <div style={{ flex: 1, padding: '14px 18px', background: C.cardBg, border: `1px solid ${C.accent}30`, borderRadius: 10 }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: C.accent, marginBottom: 2 }}>Captura experience</div>
          <div style={{ fontSize: '0.75rem', color: C.caption, lineHeight: 1.4 }}>Opens on shopper's phone</div>
        </div>
      </div>
    </div>
  )
}

export default function GS1() {
  useSEO({
    title: 'GS1 Digital Link & Sunrise 2027 for Brands | Captura',
    description: 'Retail is adopting the GS1 Digital Link 2D barcode by 2027. Captura generates branded, GS1 Digital Link\u2013ready QR codes that turn every scan into an owned, consented customer relationship.',
    canonical: 'https://meetcaptura.com/gs1',
  })

  return (
    <div style={{ minHeight: '100vh', overflow: 'hidden' }}>
      {/* Nav */}
      <nav style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '20px 40px', maxWidth: 1200, margin: '0 auto',
      }}>
        <Link to="/" style={{ fontSize: '2.2rem', fontWeight: 800, color: '#FAFAFA', letterSpacing: '-1px' }}>
          Captura
        </Link>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link to="/login" style={{
            padding: '10px 20px', fontSize: '0.9rem', color: '#A1A1AA', fontWeight: 500,
          }}>Log In</Link>
          <Link to="/login?signup=true" style={{
            padding: '10px 24px', fontSize: '0.9rem', color: '#09090B',
            fontWeight: 600, background: '#FAFAFA', borderRadius: 8,
          }}>Request Demo</Link>
        </div>
      </nav>

      {/* Section 1: Hero */}
      <section style={{
        padding: '96px 40px', maxWidth: 1200, margin: '0 auto',
        display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 64, alignItems: 'center',
      }} className="gs1-hero">
        <div>
          <div style={{
            display: 'inline-block', padding: '5px 12px', marginBottom: 24,
            background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.2)',
            borderRadius: 6, fontSize: '0.72rem', fontWeight: 600, color: C.accent,
            letterSpacing: '1.5px', textTransform: 'uppercase',
          }}>GS1 Digital Link</div>
          <h1 style={{
            fontSize: 'clamp(2.6rem, 5vw, 4rem)', fontWeight: 800,
            lineHeight: 1.05, letterSpacing: '-2px', color: C.heading,
            marginBottom: 20, maxWidth: 600,
          }}>
            Built for GS1 Sunrise 2027
          </h1>
          <p style={{
            fontSize: '1.1rem', color: C.body, lineHeight: 1.65,
            maxWidth: 480, marginBottom: 32,
          }}>
            Retail is standardizing on one smart barcode by 2027. Captura is built for it, natively.
          </p>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <Link to="/login?signup=true" style={{
              padding: '14px 32px', fontSize: '1rem', color: '#09090B',
              fontWeight: 700, background: '#FAFAFA', borderRadius: 10,
            }}>Run a Pilot</Link>
            <a href="https://meetcaptura.com" style={{
              fontSize: '0.9rem', color: C.muted, fontWeight: 500,
            }}>See it live &rarr; meetcaptura.com</a>
          </div>
        </div>
        <HeroQR />
      </section>

      {/* Section 2: What Sunrise 2027 is */}
      <FadeSection style={{
        padding: '96px 40px', maxWidth: 1200, margin: '0 auto',
        borderTop: `1px solid ${C.border}`,
      }}>
        <div style={{ maxWidth: '65ch' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: C.accent, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 14 }}>
            The standard
          </div>
          <h2 style={{
            fontSize: '2rem', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-1px',
            color: C.heading, marginBottom: 20,
          }}>
            What is GS1 Sunrise 2027?
          </h2>
          <p style={{ color: C.body, fontSize: '1.06rem', lineHeight: 1.65, marginBottom: 16 }}>
            Retail is moving from the old striped UPC barcode to a single 2D smart code called a GS1 Digital Link. By the end of 2027, retail point-of-sale systems must be able to read it, and major retailers like Walmart, Kroger, and Target are already preparing. The standard lets one code carry two things at once: the GTIN a checkout scanner reads to ring up the sale, and a link a shopper's phone can open.
          </p>
          <p style={{
            color: C.caption, fontSize: '0.78rem', lineHeight: 1.55, fontStyle: 'italic',
            marginTop: 20, paddingTop: 14, borderTop: `1px solid ${C.border}`,
          }}>
            Source: GS1 US, Sunrise 2027. GS1 Sunrise 2027 is an industry initiative, not a government mandate; 1D barcodes keep working through the transition.
          </p>
        </div>
      </FadeSection>

      {/* Section 3: Why it matters */}
      <FadeSection style={{
        padding: '96px 40px', maxWidth: 1200, margin: '0 auto',
        borderTop: `1px solid ${C.border}`,
      }}>
        <div style={{ maxWidth: '65ch' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: C.accent, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 14 }}>
            The opportunity
          </div>
          <h2 style={{
            fontSize: '2rem', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-1px',
            color: C.heading, marginBottom: 20,
          }}>
            Why it matters
          </h2>
          <p style={{ color: C.body, fontSize: '1.06rem', lineHeight: 1.65 }}>
            This is a tailwind, not a threat. A smart code is going on your packaging regardless, the standard is arriving with or without you. The only open question is what happens when a customer scans it. For most brands, that scan leads to a dead-end homepage. With Captura, it becomes an owned, consented customer relationship, tied to the exact product that was scanned.
          </p>
        </div>
      </FadeSection>

      {/* Section 4: How Captura fits */}
      <FadeSection style={{
        padding: '96px 40px', maxWidth: 1200, margin: '0 auto',
        borderTop: `1px solid ${C.border}`,
      }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 600, color: C.accent, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 14 }}>
          The platform
        </div>
        <h2 style={{
          fontSize: '2rem', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-1px',
          color: C.heading, marginBottom: 40,
        }}>
          How Captura fits the standard
        </h2>
        <div className="gs1-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, alignItems: 'stretch' }}>
          {[
            {
              title: 'Reads the standard',
              desc: 'Captura natively parses GS1 Digital Link codes, pulling your product\u2019s GTIN (the number already under every UPC) straight from the scan.',
            },
            {
              title: 'Generates the standard',
              desc: 'Captura builds your QR codes in valid GS1 Digital Link format, structured around your product\u2019s GTIN, with your logo or artwork in the center of the code. Branded, on-standard, and ready to plug into your GS1 program instead of being a throwaway marketing link.',
            },
            {
              title: 'Slots in behind yours',
              desc: 'Already migrating to GS1? Captura resolves as the consumer-experience destination behind your existing code. No second code, no packaging fight.',
            },
          ].map((card, i) => (
            <div key={i} style={{
              padding: '36px 32px', background: C.cardBg,
              border: `1px solid ${C.border}`, borderRadius: 12,
              display: 'flex', flexDirection: 'column',
            }}>
              <div style={{ width: 32, height: 3, background: C.accent, borderRadius: 2, marginBottom: 20 }}/>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 12, color: C.heading }}>
                {card.title}
              </h3>
              <p style={{ color: C.body, lineHeight: 1.65, fontSize: '0.95rem', flex: 1 }}>{card.desc}</p>
            </div>
          ))}
        </div>
      </FadeSection>

      {/* Section 5: One code, two jobs */}
      <FadeSection style={{
        padding: '96px 40px', maxWidth: 1200, margin: '0 auto',
        borderTop: `1px solid ${C.border}`,
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }} className="gs1-twocol">
          <div style={{ maxWidth: '58ch' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: C.accent, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 14 }}>
              The architecture
            </div>
            <h2 style={{
              fontSize: '2rem', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-1px',
              color: C.heading, marginBottom: 20,
            }}>
              One code, two jobs
            </h2>
            <p style={{ color: C.body, fontSize: '1.06rem', lineHeight: 1.65 }}>
              The brand's GS1 code, read by a retailer's 2D-enabled scanner, is what rings up the sale at checkout. Captura lives on the consumer half of the same code: the experience a shopper's phone opens. GTINs are licensed to brands by GS1; Captura ingests them from Shopify or manual entry and never generates them. Whether a single code also serves checkout is validated in your own retail environment.
            </p>
          </div>
          <TwoJobsDiagram />
        </div>
      </FadeSection>

      {/* Section 6: Closing CTA */}
      <section style={{
        padding: '96px 40px', textAlign: 'center',
        borderTop: `1px solid ${C.border}`,
      }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <p style={{
            fontSize: 'clamp(1.5rem, 3vw, 2.1rem)', fontWeight: 800,
            lineHeight: 1.15, letterSpacing: '-1px', color: C.heading,
            marginBottom: 32,
          }}>
            The code is going on your packaging anyway. Make it capture the customer.
          </p>
          <Link to="/login?signup=true" style={{
            display: 'inline-block', padding: '16px 44px', fontSize: '1rem',
            color: '#09090B', fontWeight: 700, background: '#FAFAFA', borderRadius: 10,
          }}>Run a Pilot</Link>
        </div>
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

      <style>{`
        @media (max-width: 768px) {
          .gs1-hero {
            grid-template-columns: 1fr !important;
            gap: 48px !important;
            padding-top: 64px !important;
            padding-bottom: 64px !important;
          }
          .gs1-twocol {
            grid-template-columns: 1fr !important;
            gap: 40px !important;
          }
          .gs1-cards {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }
          .gs1-diagram-branch {
            flex-wrap: wrap;
          }
          section {
            padding-top: 56px !important;
            padding-bottom: 56px !important;
            padding-left: 20px !important;
            padding-right: 20px !important;
          }
          nav { padding: 16px 20px !important; }
          footer { padding: 24px 20px !important; }
        }
      `}</style>
    </div>
  )
}
