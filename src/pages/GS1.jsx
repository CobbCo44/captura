import { Link } from 'react-router-dom'
import { useEffect } from 'react'

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
        padding: '120px 40px 100px', maxWidth: 1200, margin: '0 auto',
      }}>
        <h1 style={{
          fontSize: 'clamp(2.8rem, 5vw, 4.2rem)', fontWeight: 800,
          lineHeight: 1.05, letterSpacing: '-2px', color: '#FAFAFA',
          marginBottom: 24, maxWidth: 700,
        }}>
          Built for GS1 Sunrise 2027
        </h1>
        <p style={{
          fontSize: '1.15rem', color: '#71717A', lineHeight: 1.7,
          maxWidth: 560, marginBottom: 36,
        }}>
          Retail is standardizing on one smart barcode by 2027. Captura is built for it, natively.
        </p>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <Link to="/login?signup=true" style={{
            padding: '16px 36px', fontSize: '1rem', color: '#09090B',
            fontWeight: 700, background: '#FAFAFA', borderRadius: 10,
          }}>Run a Pilot</Link>
          <a href="https://meetcaptura.com" style={{
            fontSize: '0.95rem', color: '#A1A1AA', fontWeight: 500,
          }}>See it live &rarr; meetcaptura.com</a>
        </div>
      </section>

      {/* Section 2: What Sunrise 2027 is */}
      <section style={{
        padding: '100px 40px', maxWidth: 1200, margin: '0 auto',
        borderTop: '1px solid #1C1C21',
      }}>
        <div style={{ maxWidth: 700 }}>
          <h2 style={{
            fontSize: '2.2rem', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-1px',
            color: '#FAFAFA', marginBottom: 24,
          }}>
            What is GS1 Sunrise 2027?
          </h2>
          <p style={{ color: '#52525B', fontSize: '1rem', lineHeight: 1.8, marginBottom: 16 }}>
            Retail is moving from the old striped UPC barcode to a single 2D smart code called a GS1 Digital Link. By the end of 2027, retail point-of-sale systems must be able to read it, and major retailers like Walmart, Kroger, and Target are already preparing. The standard lets one code carry two things at once: the GTIN a checkout scanner reads to ring up the sale, and a link a shopper's phone can open.
          </p>
          <p style={{
            color: '#3F3F46', fontSize: '0.8rem', lineHeight: 1.6, fontStyle: 'italic',
            marginTop: 24, paddingTop: 16, borderTop: '1px solid #1C1C21',
          }}>
            Source: GS1 US, Sunrise 2027. GS1 Sunrise 2027 is an industry initiative, not a government mandate; 1D barcodes keep working through the transition.
          </p>
        </div>
      </section>

      {/* Section 3: Why it matters */}
      <section style={{
        padding: '100px 40px', maxWidth: 1200, margin: '0 auto',
        borderTop: '1px solid #1C1C21',
      }}>
        <div style={{ maxWidth: 700 }}>
          <h2 style={{
            fontSize: '2.2rem', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-1px',
            color: '#FAFAFA', marginBottom: 24,
          }}>
            Why it matters
          </h2>
          <p style={{ color: '#52525B', fontSize: '1rem', lineHeight: 1.8 }}>
            This is a tailwind, not a threat. A smart code is going on your packaging regardless, the standard is arriving with or without you. The only open question is what happens when a customer scans it. For most brands, that scan leads to a dead-end homepage. With Captura, it becomes an owned, consented customer relationship, tied to the exact product that was scanned.
          </p>
        </div>
      </section>

      {/* Section 4: How Captura fits */}
      <section style={{
        padding: '100px 40px', maxWidth: 1200, margin: '0 auto',
        borderTop: '1px solid #1C1C21',
      }}>
        <h2 style={{
          fontSize: '2.2rem', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-1px',
          color: '#FAFAFA', marginBottom: 48,
        }}>
          How Captura fits the standard
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
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
              padding: '44px 36px', background: '#131316',
              borderRight: i < 2 ? '1px solid #1C1C21' : 'none',
            }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 12, color: '#FAFAFA' }}>
                {card.title}
              </h3>
              <p style={{ color: '#52525B', lineHeight: 1.7, fontSize: '0.9rem' }}>{card.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Section 5: One code, two jobs */}
      <section style={{
        padding: '100px 40px', maxWidth: 1200, margin: '0 auto',
        borderTop: '1px solid #1C1C21',
      }}>
        <div style={{ maxWidth: 700 }}>
          <h2 style={{
            fontSize: '2.2rem', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-1px',
            color: '#FAFAFA', marginBottom: 24,
          }}>
            One code, two jobs
          </h2>
          <p style={{ color: '#52525B', fontSize: '1rem', lineHeight: 1.8 }}>
            The brand's GS1 code, read by a retailer's 2D-enabled scanner, is what rings up the sale at checkout. Captura lives on the consumer half of the same code: the experience a shopper's phone opens. GTINs are licensed to brands by GS1; Captura ingests them from Shopify or manual entry and never generates them. Whether a single code also serves checkout is validated in your own retail environment.
          </p>
        </div>
      </section>

      {/* Section 6: Closing CTA */}
      <section style={{ padding: '100px 40px 120px', textAlign: 'center', borderTop: '1px solid #1C1C21' }}>
        <p style={{
          fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 800,
          lineHeight: 1.15, letterSpacing: '-1px', color: '#FAFAFA',
          maxWidth: 650, margin: '0 auto 36px',
        }}>
          The code is going on your packaging anyway. Make it capture the customer.
        </p>
        <Link to="/login?signup=true" style={{
          display: 'inline-block', padding: '18px 48px', fontSize: '1.05rem',
          color: '#09090B', fontWeight: 700, background: '#FAFAFA', borderRadius: 10,
        }}>Run a Pilot</Link>
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
          section { padding-left: 20px !important; padding-right: 20px !important; }
          section > div[style*="grid-template-columns: repeat(3"] {
            grid-template-columns: 1fr !important;
          }
          section > div[style*="grid-template-columns: repeat"] > div {
            border-right: none !important;
            border-bottom: 1px solid #1C1C21;
          }
          nav { padding: 16px 20px !important; }
          footer { padding: 24px 20px !important; }
        }
      `}</style>
    </div>
  )
}
