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

/* Scroll reveal — respects prefers-reduced-motion */
function useFadeIn() {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) { el.style.opacity = 1; el.style.transform = 'none'; return }
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { el.style.opacity = 1; el.style.transform = 'translateY(0)'; obs.unobserve(el) }
    }, { threshold: 0.1 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return ref
}

function FadeSection({ children, style, className, ...rest }) {
  const ref = useFadeIn()
  return (
    <section ref={ref} className={className} style={{ opacity: 0, transform: 'translateY(16px)', transition: 'opacity 0.5s ease, transform 0.5s ease', ...style }} {...rest}>
      {children}
    </section>
  )
}

/* Fonts */
const DISPLAY = "'Space Grotesk', 'Inter', sans-serif"
const BODY = "'Inter', sans-serif"
const MONO = "'IBM Plex Mono', 'Menlo', monospace"

/* Colors */
const C = {
  heading: '#F4F5F7',
  body: '#C9CDD4',
  muted: '#B0B4BB',
  caption: '#7A7F8A',
  accent: '#FACC15',
  accentDim: 'rgba(250,204,21,0.12)',
  border: '#1C2027',
  cardBg: '#111318',
  cardHighlight: '#191D24',
  bg1: '#0B0D10',
  bg2: '#101318',
}

/* Shared section padding */
const SEC = { padding: '88px 40px', maxWidth: 1200, margin: '0 auto' }
const RULE = { borderTop: `1px solid ${C.border}` }

/* Eyebrow component (mono, accent) */
function Eyebrow({ children }) {
  return (
    <div style={{
      fontFamily: MONO, fontSize: '0.7rem', fontWeight: 500, color: C.accent,
      letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 14,
    }}>{children}</div>
  )
}

/* Hero image */
function HeroQR() {
  return (
    <div style={{ width: '100%', maxWidth: 400, margin: '0 auto' }}>
      <img
        src="/images/hero-qr-box.png"
        alt="Product packaging with a branded Captura QR code"
        style={{ width: '100%', height: 'auto', borderRadius: 12, display: 'block' }}
      />
    </div>
  )
}

/* "The standard" visual — 1D barcode → 2D GS1 Digital Link transition */
function TransitionVisual() {
  const mono = { fontFamily: MONO, letterSpacing: '0.5px' }
  return (
    <div style={{
      background: `linear-gradient(180deg, ${C.cardHighlight} 0%, ${C.cardBg} 100%)`,
      border: `1px solid ${C.border}`, borderTop: '1px solid #252A33',
      borderRadius: 10, padding: '32px 28px', position: 'relative', overflow: 'hidden',
    }}>
      {/* Faint grid */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.025, pointerEvents: 'none',
        backgroundImage: `linear-gradient(${C.heading} 1px, transparent 1px), linear-gradient(90deg, ${C.heading} 1px, transparent 1px)`,
        backgroundSize: '20px 20px',
      }}/>
      <div style={{ position: 'relative' }}>
        {/* 1D barcode */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ ...mono, fontSize: '0.62rem', color: C.caption, textTransform: 'uppercase', marginBottom: 10, opacity: 0.7 }}>1D UPC barcode</div>
          <div style={{
            background: C.bg1, border: `1px solid ${C.border}`, borderRadius: 6,
            padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16,
          }}>
            <svg width="100" height="44" viewBox="0 0 100 44">
              {[0,4,7,10,12,16,18,21,24,27,30,33,36,38,41,44,46,49,52,55,58,60,63,66,69,72,75,78,80,83,86,89,92,95].map((x,i) => (
                <rect key={i} x={x} y="0" width={i%3===0?3:1.5} height="36" fill={C.caption} opacity={0.5}/>
              ))}
              <text x="50" y="43" textAnchor="middle" fill={C.caption} fontSize="7" {...mono}>0 49000 04325 7</text>
            </svg>
            <div>
              <div style={{ ...mono, fontSize: '0.65rem', color: C.caption, opacity: 0.6, lineHeight: 1.4 }}>PRODUCT ID ONLY</div>
              <div style={{ ...mono, fontSize: '0.65rem', color: C.caption, opacity: 0.4, lineHeight: 1.4 }}>NO LINK CAPABILITY</div>
            </div>
          </div>
        </div>

        {/* Arrow */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}>
          <div style={{ width: 1, height: 0, borderLeft: `1px dashed ${C.accent}`, opacity: 0.4 }}/>
          <svg width="24" height="24" viewBox="0 0 24 24" style={{ display: 'block' }}>
            <path d="M12 4 L12 18 M7 14 L12 19 L17 14" stroke={C.accent} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        {/* 2D GS1 Digital Link */}
        <div>
          <div style={{ ...mono, fontSize: '0.62rem', color: C.accent, textTransform: 'uppercase', marginBottom: 10, opacity: 0.8 }}>GS1 Digital Link</div>
          <div style={{
            background: C.bg1, border: `1px solid ${C.accent}20`, borderRadius: 6,
            padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16,
          }}>
            <svg width="56" height="56" viewBox="0 0 56 56">
              {/* QR finder patterns */}
              {[[2,2],[38,2],[2,38]].map(([x,y],i) => (
                <g key={i}>
                  <rect x={x} y={y} width={16} height={16} rx={1.5} fill="none" stroke={C.accent} strokeWidth="1.5" opacity="0.8"/>
                  <rect x={x+4} y={y+4} width={8} height={8} rx={1} fill={C.accent} opacity="0.6"/>
                </g>
              ))}
              {/* Data dots */}
              {[[22,4],[26,4],[30,4],[34,4],[22,8],[30,8],[22,12],[26,12],[34,12],
                [4,22],[8,22],[12,22],[4,26],[12,26],[4,30],[8,30],[12,30],
                [22,22],[26,22],[30,22],[38,22],[42,22],[46,22],[50,22],
                [22,26],[34,26],[42,26],[50,26],
                [22,30],[26,30],[30,30],[42,30],[46,30],[50,30],
                [38,38],[42,38],[46,38],[50,38],
                [38,42],[50,42],[38,46],[42,46],[50,46],
                [38,50],[46,50],[50,50],
                [22,38],[30,38],[22,42],[26,42],[22,46],[30,46],[26,50],[30,50],
              ].map(([x,y],i) => (
                <rect key={i} x={x} y={y} width={3} height={3} rx={0.5} fill={C.accent} opacity={0.5}/>
              ))}
            </svg>
            <div>
              <div style={{ ...mono, fontSize: '0.65rem', color: C.accent, opacity: 0.8, lineHeight: 1.4 }}>GTIN + LINK IN ONE CODE</div>
              <div style={{ ...mono, fontSize: '0.65rem', color: C.caption, opacity: 0.6, lineHeight: 1.4, marginTop: 2 }}>CHECKOUT + CONSUMER</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* "The opportunity" visual — scan outcome comparison */
function OutcomeVisual() {
  const mono = { fontFamily: MONO, letterSpacing: '0.5px' }
  return (
    <div style={{
      background: `linear-gradient(180deg, ${C.cardHighlight} 0%, ${C.cardBg} 100%)`,
      border: `1px solid ${C.border}`, borderTop: '1px solid #252A33',
      borderRadius: 10, padding: '32px 28px', position: 'relative', overflow: 'hidden',
    }}>
      {/* Faint grid */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.025, pointerEvents: 'none',
        backgroundImage: `linear-gradient(${C.heading} 1px, transparent 1px), linear-gradient(90deg, ${C.heading} 1px, transparent 1px)`,
        backgroundSize: '20px 20px',
      }}/>
      <div style={{ position: 'relative' }}>
        {/* Without Captura */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ ...mono, fontSize: '0.62rem', color: C.caption, textTransform: 'uppercase', marginBottom: 10, opacity: 0.7 }}>Without Captura</div>
          <div style={{
            background: C.bg1, border: `1px solid ${C.border}`, borderRadius: 6, padding: '14px 18px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Phone icon */}
              <svg width="28" height="28" viewBox="0 0 28 28" style={{ flexShrink: 0 }}>
                <rect x="6" y="2" width="16" height="24" rx="3" fill="none" stroke={C.caption} strokeWidth="1" opacity="0.4"/>
                <line x1="11" y1="22" x2="17" y2="22" stroke={C.caption} strokeWidth="0.75" opacity="0.3"/>
              </svg>
              <div style={{ flex: 1 }}>
                <div style={{
                  background: C.border, borderRadius: 3, padding: '8px 12px',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.caption, opacity: 0.3 }}/>
                  <div style={{ ...mono, fontSize: '0.6rem', color: C.caption, opacity: 0.5 }}>brand.com</div>
                </div>
              </div>
              <svg width="20" height="20" viewBox="0 0 20 20" style={{ flexShrink: 0 }}>
                <path d="M6 10 L14 10" stroke={C.caption} strokeWidth="1" opacity="0.3"/>
                <path d="M11 7 L14 10 L11 13" stroke={C.caption} strokeWidth="1" fill="none" opacity="0.3"/>
              </svg>
              <div style={{ ...mono, fontSize: '0.6rem', color: C.caption, opacity: 0.4 }}>DEAD END</div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ flex: 1, height: 1, background: C.border }}/>
          <div style={{ ...mono, fontSize: '0.58rem', color: C.caption, opacity: 0.4 }}>VS</div>
          <div style={{ flex: 1, height: 1, background: C.border }}/>
        </div>

        {/* With Captura */}
        <div>
          <div style={{ ...mono, fontSize: '0.62rem', color: C.accent, textTransform: 'uppercase', marginBottom: 10, opacity: 0.8 }}>With Captura</div>
          <div style={{
            background: C.bg1, border: `1px solid ${C.accent}20`, borderRadius: 6, padding: '14px 18px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <svg width="28" height="28" viewBox="0 0 28 28" style={{ flexShrink: 0 }}>
                <rect x="6" y="2" width="16" height="24" rx="3" fill="none" stroke={C.accent} strokeWidth="1" opacity="0.6"/>
                <line x1="11" y1="22" x2="17" y2="22" stroke={C.accent} strokeWidth="0.75" opacity="0.4"/>
              </svg>
              <div style={{ flex: 1 }}>
                <div style={{
                  background: `${C.accent}10`, border: `1px solid ${C.accent}18`,
                  borderRadius: 3, padding: '8px 12px',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.accent, opacity: 0.6 }}/>
                  <div style={{ ...mono, fontSize: '0.6rem', color: C.accent, opacity: 0.7 }}>Branded experience</div>
                </div>
              </div>
            </div>
            {/* Data captured rows */}
            {[
              { label: 'IDENTITY', value: 'Name, email, phone' },
              { label: 'LOCATION', value: 'City-level geo' },
              { label: 'PRODUCT', value: 'Exact GTIN scanned' },
            ].map((row, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '6px 0',
                borderTop: i === 0 ? `1px solid ${C.border}` : 'none',
                borderBottom: `1px solid ${C.border}`,
              }}>
                <span style={{ ...mono, fontSize: '0.58rem', color: C.caption, opacity: 0.6 }}>{row.label}</span>
                <span style={{ ...mono, fontSize: '0.6rem', color: C.body, opacity: 0.8 }}>{row.value}</span>
              </div>
            ))}
            <div style={{ ...mono, fontSize: '0.58rem', color: C.accent, opacity: 0.6, marginTop: 8, textAlign: 'right' }}>OWNED RELATIONSHIP &rarr;</div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* Spec-sheet wiring diagram for "One code, two jobs" */
function TwoJobsDiagram() {
  const mono = { fontFamily: MONO, letterSpacing: '0.5px' }
  return (
    <div className="gs1-diagram" style={{ padding: '24px 0', position: 'relative' }}>
      {/* Faint grid background */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.04, pointerEvents: 'none',
        backgroundImage: `
          linear-gradient(${C.heading} 1px, transparent 1px),
          linear-gradient(90deg, ${C.heading} 1px, transparent 1px)
        `,
        backgroundSize: '24px 24px',
      }}/>

      <svg viewBox="0 0 360 240" width="100%" style={{ display: 'block', maxWidth: 420, margin: '0 auto' }}>
        {/* Grid tick marks along edges */}
        {[0,24,48,72,96,120,144,168,192,216,240].map(y => (
          <line key={`ty${y}`} x1="0" y1={y} x2="6" y2={y} stroke={C.heading} strokeWidth="0.5" opacity="0.1"/>
        ))}
        {[0,24,48,72,96,120,144,168,192,216,240,264,288,312,336,360].map(x => (
          <line key={`tx${x}`} x1={x} y1="234" x2={x} y2="240" stroke={C.heading} strokeWidth="0.5" opacity="0.1"/>
        ))}

        {/* Center node — QR glyph */}
        <rect x="155" y="95" width="50" height="50" rx="6" fill={C.cardBg} stroke={C.accent} strokeWidth="1.5"/>
        {/* QR pattern inside */}
        <rect x="164" y="104" width="10" height="10" rx="1" fill={C.accent} opacity="0.9"/>
        <rect x="186" y="104" width="10" height="10" rx="1" fill={C.accent} opacity="0.9"/>
        <rect x="164" y="126" width="10" height="10" rx="1" fill={C.accent} opacity="0.9"/>
        <rect x="182" y="122" width="6" height="6" rx="1" fill={C.accent} opacity="0.6"/>
        <rect x="190" y="128" width="4" height="6" rx="1" fill={C.accent} opacity="0.6"/>
        {/* Glow */}
        <circle cx="180" cy="120" r="32" fill="url(#nodeGlow)" opacity="0.5"/>
        <defs>
          <radialGradient id="nodeGlow">
            <stop offset="0%" stopColor={C.accent} stopOpacity="0.15"/>
            <stop offset="100%" stopColor={C.accent} stopOpacity="0"/>
          </radialGradient>
        </defs>

        {/* Top branch — POS */}
        <line x1="180" y1="95" x2="180" y2="56" stroke={C.caption} strokeWidth="1" strokeDasharray="3 2"/>
        <line x1="180" y1="56" x2="310" y2="56" stroke={C.caption} strokeWidth="1" strokeDasharray="3 2"/>
        <circle cx="310" cy="56" r="3" fill={C.caption}/>
        {/* POS label */}
        <text x="310" y="44" textAnchor="end" fill={C.heading} fontSize="11" fontWeight="600" fontFamily="Inter, sans-serif">Brand's GS1 code</text>
        <text x="310" y="72" textAnchor="end" fill={C.caption} fontSize="9.5" {...mono}>RINGS UP AT POS</text>
        {/* Register icon */}
        <rect x="318" y="42" width="28" height="22" rx="3" fill="none" stroke={C.caption} strokeWidth="1" opacity="0.5"/>
        <line x1="318" y1="50" x2="346" y2="50" stroke={C.caption} strokeWidth="0.75" opacity="0.5"/>

        {/* Bottom branch — Captura */}
        <line x1="180" y1="145" x2="180" y2="184" stroke={C.accent} strokeWidth="1" strokeDasharray="3 2"/>
        <line x1="180" y1="184" x2="310" y2="184" stroke={C.accent} strokeWidth="1" strokeDasharray="3 2"/>
        <circle cx="310" cy="184" r="3" fill={C.accent}/>
        {/* Captura label */}
        <text x="310" y="172" textAnchor="end" fill={C.accent} fontSize="11" fontWeight="600" fontFamily="Inter, sans-serif">Captura experience</text>
        <text x="310" y="200" textAnchor="end" fill={C.caption} fontSize="9.5" {...mono}>OPENS ON SHOPPER'S PHONE</text>
        {/* Phone icon */}
        <rect x="320" y="172" width="18" height="26" rx="4" fill="none" stroke={C.accent} strokeWidth="1" opacity="0.6"/>
        <line x1="326" y1="192" x2="332" y2="192" stroke={C.accent} strokeWidth="0.75" opacity="0.6"/>

        {/* Source label */}
        <text x="180" y="230" textAnchor="middle" fill={C.caption} fontSize="8.5" opacity="0.6" {...mono}>GS1 DIGITAL LINK</text>
      </svg>
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
    <div className="gs1-page" style={{ minHeight: '100vh', overflow: 'hidden', background: `linear-gradient(180deg, ${C.bg1} 0%, ${C.bg2} 100%)` }}>
      {/* Nav */}
      <nav style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '20px 40px', maxWidth: 1200, margin: '0 auto',
      }}>
        <Link to="/" style={{ fontFamily: DISPLAY, fontSize: '2rem', fontWeight: 700, color: '#FAFAFA', letterSpacing: '-1px' }}>
          Captura
        </Link>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link to="/login" className="gs1-nav-link" style={{
            padding: '10px 20px', fontSize: '0.9rem', color: '#A1A1AA', fontWeight: 500,
          }}>Log In</Link>
          <Link to="/login?signup=true" className="gs1-nav-cta" style={{
            padding: '10px 24px', fontSize: '0.9rem', color: '#09090B',
            fontWeight: 600, background: '#FAFAFA', borderRadius: 8,
          }}>Request Demo</Link>
        </div>
      </nav>

      {/* Section 1: Hero */}
      <section style={{
        ...SEC, paddingTop: 72, paddingBottom: 80,
        display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: 56, alignItems: 'center',
      }} className="gs1-hero">
        <div>
          <div style={{
            display: 'inline-block', padding: '4px 10px', marginBottom: 20,
            background: C.accentDim, border: `1px solid rgba(250,204,21,0.18)`,
            borderRadius: 4,
            fontFamily: MONO, fontSize: '0.68rem', fontWeight: 500, color: C.accent,
            letterSpacing: '1.5px', textTransform: 'uppercase',
            boxShadow: '0 0 16px rgba(250,204,21,0.06)',
          }}>GS1 Digital Link</div>
          <h1 style={{
            fontFamily: DISPLAY, fontSize: 'clamp(2.8rem, 5.5vw, 4.4rem)', fontWeight: 700,
            lineHeight: 1.02, letterSpacing: '-0.03em', color: C.heading,
            marginBottom: 18, maxWidth: 560,
          }}>
            Built for GS1 Sunrise 2027
          </h1>
          <p style={{
            fontFamily: BODY, fontSize: '1.08rem', color: C.body, lineHeight: 1.6,
            maxWidth: '52ch', marginBottom: 28,
          }}>
            Retail is standardizing on one smart barcode by 2027. Captura is built for it, natively.
          </p>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <Link to="/login?signup=true" className="gs1-cta-btn" style={{
              padding: '13px 30px', fontSize: '0.95rem', color: '#09090B',
              fontWeight: 700, background: '#FAFAFA', borderRadius: 8,
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}>Run a Pilot</Link>
            <a href="https://meetcaptura.com" style={{
              fontFamily: MONO, fontSize: '0.8rem', color: C.muted, fontWeight: 400,
              letterSpacing: '0.3px',
            }}>See it live &rarr; meetcaptura.com</a>
          </div>
        </div>
        <HeroQR />
      </section>

      {/* Section 2: What Sunrise 2027 is */}
      <FadeSection style={{ ...SEC, ...RULE }} className="gs1-section">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56, alignItems: 'center' }} className="gs1-twocol">
          <div style={{ maxWidth: '62ch' }}>
            <Eyebrow>The standard</Eyebrow>
            <h2 style={{
              fontFamily: DISPLAY, fontSize: '1.9rem', fontWeight: 700, lineHeight: 1.08,
              letterSpacing: '-0.02em', color: C.heading, marginBottom: 18,
            }}>
              What is GS1 Sunrise 2027?
            </h2>
            <p style={{ fontFamily: BODY, color: C.body, fontSize: '1.06rem', lineHeight: 1.6, marginBottom: 16 }}>
              Retail is moving from the old striped UPC barcode to a single 2D smart code called a GS1 Digital Link. By the end of 2027, retail point-of-sale systems must be able to read it, and major retailers like Walmart, Kroger, and Target are already preparing. The standard lets one code carry two things at once: the GTIN a checkout scanner reads to ring up the sale, and a link a shopper's phone can open.
            </p>
            <p style={{
              fontFamily: MONO, color: C.caption, fontSize: '0.72rem', lineHeight: 1.55,
              marginTop: 18, paddingTop: 14, borderTop: `1px solid ${C.border}`,
              letterSpacing: '0.2px',
            }}>
              Source: GS1 US, Sunrise 2027. GS1 Sunrise 2027 is an industry initiative, not a government mandate; 1D barcodes keep working through the transition.
            </p>
          </div>
          {/* Barcode transition visual */}
          <TransitionVisual />
        </div>
      </FadeSection>

      {/* Section 3: Why it matters */}
      <FadeSection style={{ ...SEC, ...RULE }} className="gs1-section">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56, alignItems: 'center' }} className="gs1-twocol">
          <div style={{ maxWidth: '62ch' }}>
            <Eyebrow>The opportunity</Eyebrow>
            <h2 style={{
              fontFamily: DISPLAY, fontSize: '1.9rem', fontWeight: 700, lineHeight: 1.08,
              letterSpacing: '-0.02em', color: C.heading, marginBottom: 18,
            }}>
              Why it matters
            </h2>
            <p style={{ fontFamily: BODY, color: C.body, fontSize: '1.06rem', lineHeight: 1.6 }}>
              This is a tailwind, not a threat. A smart code is going on your packaging regardless, the standard is arriving with or without you. The only open question is what happens when a customer scans it. For most brands, that scan leads to a dead-end homepage. With Captura, it becomes an owned, consented customer relationship, tied to the exact product that was scanned.
            </p>
          </div>
          {/* Scan outcome visual */}
          <OutcomeVisual />
        </div>
      </FadeSection>

      {/* Section 4: How Captura fits */}
      <FadeSection style={{ ...SEC, ...RULE }} className="gs1-section">
        <Eyebrow>The platform</Eyebrow>
        <h2 style={{
          fontFamily: DISPLAY, fontSize: '1.9rem', fontWeight: 700, lineHeight: 1.08,
          letterSpacing: '-0.02em', color: C.heading, marginBottom: 36,
        }}>
          How Captura fits the standard
        </h2>
        <div className="gs1-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, alignItems: 'stretch' }}>
          {[
            {
              num: '01',
              title: 'Reads the standard',
              desc: 'Captura natively parses GS1 Digital Link codes, pulling your product\u2019s GTIN (the number already under every UPC) straight from the scan.',
            },
            {
              num: '02',
              title: 'Generates the standard',
              desc: 'Captura builds your QR codes in valid GS1 Digital Link format, structured around your product\u2019s GTIN, with your logo or artwork in the center of the code. Branded, on-standard, and ready to plug into your GS1 program instead of being a throwaway marketing link.',
            },
            {
              num: '03',
              title: 'Slots in behind yours',
              desc: 'Already migrating to GS1? Captura resolves as the consumer-experience destination behind your existing code. No second code, no packaging fight.',
            },
          ].map((card, i) => (
            <div key={i} style={{
              padding: '32px 28px', background: `linear-gradient(180deg, ${C.cardHighlight} 0%, ${C.cardBg} 100%)`,
              border: `1px solid ${C.border}`, borderRadius: 10,
              borderTop: `1px solid #252A33`,
              display: 'flex', flexDirection: 'column',
            }}>
              <div style={{
                fontFamily: MONO, fontSize: '0.65rem', color: C.caption,
                letterSpacing: '1px', marginBottom: 14, opacity: 0.6,
              }}>{card.num}</div>
              <h3 style={{
                fontFamily: DISPLAY, fontSize: '1.1rem', fontWeight: 700,
                marginBottom: 10, color: C.heading,
                paddingBottom: 10, borderBottom: `2px solid ${C.accent}`,
                display: 'inline-block', alignSelf: 'flex-start',
              }}>
                {card.title}
              </h3>
              <p style={{ fontFamily: BODY, color: C.body, lineHeight: 1.6, fontSize: '0.93rem', flex: 1, marginTop: 6 }}>{card.desc}</p>
            </div>
          ))}
        </div>
      </FadeSection>

      {/* Section 5: One code, two jobs */}
      <FadeSection style={{ ...SEC, ...RULE }} className="gs1-section">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }} className="gs1-twocol">
          <div style={{ maxWidth: '56ch' }}>
            <Eyebrow>The architecture</Eyebrow>
            <h2 style={{
              fontFamily: DISPLAY, fontSize: '1.9rem', fontWeight: 700, lineHeight: 1.08,
              letterSpacing: '-0.02em', color: C.heading, marginBottom: 18,
            }}>
              One code, two jobs
            </h2>
            <p style={{ fontFamily: BODY, color: C.body, fontSize: '1.06rem', lineHeight: 1.6 }}>
              The brand's GS1 code, read by a retailer's 2D-enabled scanner, is what rings up the sale at checkout. Captura lives on the consumer half of the same code: the experience a shopper's phone opens. GTINs are licensed to brands by GS1; Captura ingests them from Shopify or manual entry and never generates them. Whether a single code also serves checkout is validated in your own retail environment.
            </p>
          </div>
          <TwoJobsDiagram />
        </div>
      </FadeSection>

      {/* Section 6: Closing CTA */}
      <section style={{ ...SEC, ...RULE, textAlign: 'center', paddingBottom: 96 }} className="gs1-section">
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <p style={{
            fontFamily: DISPLAY, fontSize: 'clamp(1.4rem, 2.8vw, 2rem)', fontWeight: 700,
            lineHeight: 1.12, letterSpacing: '-0.02em', color: C.heading,
            marginBottom: 28,
          }}>
            The code is going on your packaging anyway. Make it capture the customer.
          </p>
          <Link to="/login?signup=true" className="gs1-cta-btn" style={{
            display: 'inline-block', padding: '14px 40px', fontSize: '0.95rem',
            color: '#09090B', fontWeight: 700, background: '#FAFAFA', borderRadius: 8,
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}>Run a Pilot</Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '28px 40px', borderTop: `1px solid ${C.border}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        maxWidth: 1200, margin: '0 auto', flexWrap: 'wrap', gap: 16,
      }}>
        <span style={{ fontFamily: MONO, color: '#3A3F4A', fontSize: '0.75rem' }}>&copy; 2026 Captura</span>
        <div style={{ display: 'flex', gap: 24 }}>
          <Link to="/terms" className="gs1-foot-link" style={{ fontFamily: MONO, color: '#3A3F4A', fontSize: '0.75rem' }}>Terms</Link>
          <Link to="/privacy" className="gs1-foot-link" style={{ fontFamily: MONO, color: '#3A3F4A', fontSize: '0.75rem' }}>Privacy</Link>
        </div>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');

        .gs1-page {
          position: relative;
        }
        /* Faint graph-paper grid behind content */
        .gs1-page::before {
          content: '';
          position: fixed;
          inset: 0;
          pointer-events: none;
          opacity: 0.03;
          background-image:
            linear-gradient(${C.heading} 1px, transparent 1px),
            linear-gradient(90deg, ${C.heading} 1px, transparent 1px);
          background-size: 48px 48px;
          z-index: 0;
        }
        .gs1-page > * {
          position: relative;
          z-index: 1;
        }

        .gs1-cta-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 20px rgba(250,250,250,0.1);
        }
        .gs1-cta-btn:focus-visible,
        .gs1-nav-link:focus-visible,
        .gs1-nav-cta:focus-visible,
        .gs1-foot-link:focus-visible {
          outline: 2px solid ${C.accent};
          outline-offset: 2px;
        }

        @media (prefers-reduced-motion: reduce) {
          .gs1-page section {
            opacity: 1 !important;
            transform: none !important;
            transition: none !important;
          }
          .gs1-cta-btn {
            transition: none !important;
          }
        }

        @media (max-width: 768px) {
          .gs1-hero {
            grid-template-columns: 1fr !important;
            gap: 40px !important;
            padding-top: 56px !important;
            padding-bottom: 56px !important;
          }
          .gs1-twocol {
            grid-template-columns: 1fr !important;
            gap: 32px !important;
          }
          .gs1-cards {
            grid-template-columns: 1fr !important;
            gap: 10px !important;
          }
          .gs1-section,
          .gs1-page > section {
            padding-top: 56px !important;
            padding-bottom: 56px !important;
            padding-left: 20px !important;
            padding-right: 20px !important;
          }
          nav { padding: 16px 20px !important; }
          footer { padding: 20px !important; }
          .gs1-diagram svg {
            max-width: 100% !important;
          }
        }
      `}</style>
    </div>
  )
}
