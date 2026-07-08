import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <div style={{ minHeight: '100vh', overflow: 'hidden' }}>
      {/* Nav */}
      <nav style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '20px 40px', maxWidth: 1200, margin: '0 auto',
      }}>
        <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#FAFAFA', letterSpacing: '-1px' }}>
          Captura
        </div>
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

      {/* Hero */}
      <section style={{
        padding: '120px 40px 60px', maxWidth: 1200, margin: '0 auto',
        display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 80, alignItems: 'center',
      }}>
        <div>
          <div style={{
            fontSize: '0.75rem', color: '#3F3F46', fontWeight: 600, letterSpacing: '3px',
            textTransform: 'uppercase', marginBottom: 20,
          }}>Consumer Intelligence Platform</div>
          <h1 style={{
            fontSize: 'clamp(2.8rem, 5vw, 4.2rem)', fontWeight: 800,
            lineHeight: 1.05, letterSpacing: '-2px', color: '#FAFAFA',
            marginBottom: 28,
          }}>
            You know the demographics.<br />
            Now meet the people.
          </h1>
          <p style={{
            fontSize: '1.15rem', color: '#71717A', lineHeight: 1.7,
            maxWidth: 480, marginBottom: 20,
          }}>
            You have market research. Retail sell-through reports. Demographic profiles. What you don't have is a direct line to the individual consumer holding your product right now. Captura bridges that gap. One scan turns an anonymous buyer into a relationship you own.
          </p>
          <p style={{
            fontSize: '1rem', color: '#52525B', lineHeight: 1.7,
            maxWidth: 480, marginBottom: 36,
          }}>
            No app downloads. No loyalty card friction. Just a QR code on your product and a consumer who scans it.
          </p>
          <div style={{ display: 'flex', gap: 14 }}>
            <Link to="/login?signup=true" style={{
              padding: '16px 36px', fontSize: '1rem', color: '#09090B',
              fontWeight: 700, background: '#FAFAFA', borderRadius: 10,
            }}>Get Started</Link>
            <a href="#roi" style={{
              padding: '16px 36px', fontSize: '1rem', color: '#71717A',
              fontWeight: 600, borderRadius: 10, border: '1px solid #27272A',
            }}>See the ROI</a>
          </div>
        </div>

        {/* Live feed visual */}
        <div style={{
          background: '#131316', border: '1px solid #27272A', borderRadius: 20,
          padding: '32px', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ fontSize: '0.7rem', color: '#3F3F46', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 16 }}>
            Live consumer captures
          </div>
          {[
            { city: 'Houston, TX', product: 'Performance Bat 34"', time: '2s ago', type: 'VIP Signup' },
            { city: 'Miami, FL', product: 'Training Gloves XL', time: '14s ago', type: 'Scan' },
            { city: 'Denver, CO', product: 'Performance Bat 32"', time: '31s ago', type: 'Promo Entry' },
            { city: 'Austin, TX', product: 'Fielding Glove 12.5"', time: '1m ago', type: 'VIP Signup' },
            { city: 'Chicago, IL', product: 'Training Gloves L', time: '2m ago', type: 'Scan' },
            { city: 'Seattle, WA', product: 'Performance Bat 34"', time: '3m ago', type: 'VIP Signup' },
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 0',
              borderBottom: i < 5 ? '1px solid #1C1C21' : 'none',
              opacity: 1 - (i * 0.1),
            }}>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#FAFAFA' }}>{item.product}</div>
                <div style={{ fontSize: '0.7rem', color: '#52525B' }}>{item.city}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontSize: '0.65rem', fontWeight: 600,
                  color: item.type === 'VIP Signup' ? '#22C55E' : item.type === 'Promo Entry' ? '#F59E0B' : '#52525B',
                }}>{item.type}</div>
                <div style={{ fontSize: '0.65rem', color: '#27272A' }}>{item.time}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* The problem */}
      <section style={{
        padding: '100px 40px', maxWidth: 1200, margin: '0 auto',
        borderTop: '1px solid #1C1C21',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80 }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#3F3F46', fontWeight: 600, letterSpacing: '3px', textTransform: 'uppercase', marginBottom: 16 }}>
              The problem
            </div>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-1px', color: '#FAFAFA', marginBottom: 24 }}>
              You know the market. You're missing the individual.
            </h2>
            <p style={{ color: '#52525B', fontSize: '1rem', lineHeight: 1.8, marginBottom: 16 }}>
              You know your buyer is 28, male, lives in the Sun Belt, and shops at Dick's. That's useful for ad targeting. It's useless for building a relationship.
            </p>
            <p style={{ color: '#52525B', fontSize: '1rem', lineHeight: 1.8 }}>
              You can't text a demographic. You can't send a product drop alert to a market segment. You need individual contact data from the people actually using your product.
            </p>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#3F3F46', fontWeight: 600, letterSpacing: '3px', textTransform: 'uppercase', marginBottom: 16 }}>
              The shift
            </div>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-1px', color: '#FAFAFA', marginBottom: 24 }}>
              Go from aggregate data to individual relationships
            </h2>
            <p style={{ color: '#52525B', fontSize: '1rem', lineHeight: 1.8, marginBottom: 16 }}>
              Captura layers on top of what you already know. Your demographic research tells you the market. Captura gives you each person in it. Name, phone, email, location, and which specific product they're holding.
            </p>
            <p style={{ color: '#52525B', fontSize: '1rem', lineHeight: 1.8 }}>
              That is the difference between knowing your audience and owning the relationship with them.
            </p>
          </div>
        </div>
      </section>

      {/* ROI */}
      <section id="roi" style={{
        padding: '100px 40px', maxWidth: 1200, margin: '0 auto',
        borderTop: '1px solid #1C1C21',
      }}>
        <div style={{ maxWidth: 600, marginBottom: 60 }}>
          <div style={{ fontSize: '0.75rem', color: '#3F3F46', fontWeight: 600, letterSpacing: '3px', textTransform: 'uppercase', marginBottom: 16 }}>
            The ROI
          </div>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-1px', color: '#FAFAFA' }}>
            The math on owning your consumer
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
          {[
            { value: '$0.00', label: 'Cost per scan', sub: 'No hardware. No app. A printed QR code.' },
            { value: '18%', label: 'Avg VIP conversion', sub: 'Nearly 1 in 5 scanners give you their contact info voluntarily.' },
            { value: '$1', label: 'Your cost per contact', sub: 'One dollar per opted-in consumer you capture. No hardware, no per-scan fee \u2014 you pay only for real, reachable contacts.' },
            { value: '\u221E', label: 'Owned, not rented', sub: "The relationship is yours \u2014 not the retailer\u2019s, not the ad platform\u2019s. Re-engage anytime, with consent." },
          ].map((item, i) => (
            <div key={i} style={{
              padding: '40px 32px', background: '#131316',
              borderRight: i < 3 ? '1px solid #1C1C21' : 'none',
            }}>
              <div style={{
                fontSize: '2.5rem', fontWeight: 800, color: '#FAFAFA',
                letterSpacing: '-1px', marginBottom: 8,
              }}>{item.value}</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#A1A1AA', marginBottom: 8 }}>{item.label}</div>
              <p style={{ color: '#3F3F46', fontSize: '0.85rem', lineHeight: 1.5 }}>{item.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" style={{
        padding: '100px 40px', maxWidth: 1200, margin: '0 auto',
        borderTop: '1px solid #1C1C21',
      }}>
        <div style={{ maxWidth: 500, marginBottom: 60 }}>
          <div style={{ fontSize: '0.75rem', color: '#3F3F46', fontWeight: 600, letterSpacing: '3px', textTransform: 'uppercase', marginBottom: 16 }}>
            How it works
          </div>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-1px', color: '#FAFAFA' }}>
            From factory floor to consumer phone in three steps
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
          {[
            {
              num: '01',
              title: 'Configure',
              desc: 'Add your products with images, SKUs, and content. Generate QR codes with your brand colors and logo. Set up VIP capture and promotional campaigns.',
            },
            {
              num: '02',
              title: 'Deploy',
              desc: 'Print QR codes directly on packaging, hang tags, stickers, or inserts. The code links to your branded product page. No app required for the consumer.',
            },
            {
              num: '03',
              title: 'Connect',
              desc: 'Every scan surfaces geographic and device data. Consumers engage with your content and voluntarily opt in, and you build a first-party database of real, reachable buyers.',
            },
          ].map((item, i) => (
            <div key={item.num} style={{
              padding: '44px 36px', background: '#131316',
              borderRight: i < 2 ? '1px solid #1C1C21' : 'none',
            }}>
              <div style={{ fontSize: '3rem', fontWeight: 800, color: '#1C1C21', lineHeight: 1, marginBottom: 24 }}>{item.num}</div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 12, color: '#FAFAFA' }}>{item.title}</h3>
              <p style={{ color: '#52525B', lineHeight: 1.7, fontSize: '0.9rem' }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* The Value Exchange */}
      <section style={{
        padding: '100px 40px', maxWidth: 1200, margin: '0 auto',
        borderTop: '1px solid #1C1C21',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
          {/* Phone mockup - left side */}
          <div style={{
            background: '#131316', border: '1px solid #1C1C21', borderRadius: 32,
            padding: '16px', maxWidth: 320, margin: '0 auto',
          }}>
            <div style={{
              background: '#09090B', borderRadius: 22, padding: '28px 20px',
              minHeight: 420,
            }}>
              {/* Brand header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid #1C1C21' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1C1C21', border: '1px solid #27272A' }} />
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#FAFAFA' }}>Performance Bat 34"</div>
                  <div style={{ fontSize: '0.6rem', color: '#3F3F46', textTransform: 'uppercase', letterSpacing: '1px' }}>44 Pro</div>
                </div>
              </div>

              {/* Scan page rows */}
              {[
                { label: 'Register your warranty', sub: 'Covered in 10 seconds. No receipt needed.' },
                { label: 'Reorder in one tap', sub: 'Running low? Restock instantly.' },
                { label: 'Enter to win', sub: 'Exclusive giveaways for owners.' },
                { label: 'Unlock VIP access', sub: 'Early drops, member-only deals.' },
                { label: 'Watch how-to content', sub: 'Get more from your gear.' },
              ].map((row, i) => (
                <div key={i} style={{
                  padding: '14px 0',
                  borderBottom: i < 4 ? '1px solid #1C1C21' : 'none',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#FAFAFA', marginBottom: 2 }}>{row.label}</div>
                    <div style={{ fontSize: '0.7rem', color: '#3F3F46' }}>{row.sub}</div>
                  </div>
                  <div style={{ color: '#27272A', fontSize: '0.9rem' }}>&#8250;</div>
                </div>
              ))}
            </div>
          </div>

          {/* Text - right side */}
          <div>
            <div style={{ fontSize: '0.75rem', color: '#3F3F46', fontWeight: 600, letterSpacing: '3px', textTransform: 'uppercase', marginBottom: 16 }}>
              The value exchange
            </div>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-1px', color: '#FAFAFA', marginBottom: 24 }}>
              Consumers don't scan for you. They scan for themselves.
            </h2>
            <p style={{ color: '#52525B', fontSize: '1rem', lineHeight: 1.8, marginBottom: 16 }}>
              Nobody hands over their phone number for nothing. They scan because they get something real in return, and you get the relationship as a result.
            </p>
            <p style={{ color: '#52525B', fontSize: '1rem', lineHeight: 1.8 }}>
              The value exchange is what drives an average 18% opt-in. Give people a reason, and they come to you.
            </p>
          </div>
        </div>
      </section>

      {/* What you capture */}
      <section style={{
        padding: '100px 40px', maxWidth: 1200, margin: '0 auto',
        borderTop: '1px solid #1C1C21',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80 }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#3F3F46', fontWeight: 600, letterSpacing: '3px', textTransform: 'uppercase', marginBottom: 16 }}>
              What you capture
            </div>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-1px', color: '#FAFAFA', marginBottom: 40 }}>
              Every scan builds your consumer intelligence
            </h2>

            {[
              { title: 'Identity', desc: 'First name, last name, email, phone number. Collected through VIP signup and promotional entry. Voluntary, compliant, and actionable.' },
              { title: 'Location', desc: 'City-level geographic data on every single scan. Know where your products are being used, not just where they shipped.' },
              { title: 'Behavior', desc: 'Which products get scanned most. Which SKUs convert to signups. Where engagement is hot and where it is cold.' },
              { title: 'Reach', desc: 'Text, email, and re-engage captured consumers directly. Run promotions that drive repeat scans. Build a relationship beyond the shelf.' },
            ].map((item, i) => (
              <div key={i} style={{
                padding: '20px 0',
                borderBottom: '1px solid #1C1C21',
              }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#FAFAFA', marginBottom: 6 }}>{item.title}</h4>
                <p style={{ color: '#52525B', fontSize: '0.9rem', lineHeight: 1.7 }}>{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Dashboard preview */}
          <div style={{
            background: '#131316', border: '1px solid #1C1C21', borderRadius: 16,
            padding: '36px', display: 'flex', flexDirection: 'column', justifyContent: 'center',
          }}>
            <div style={{ fontSize: '0.7rem', color: '#3F3F46', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 20 }}>
              Consumer data dashboard
            </div>

            {[
              { label: 'Total Consumers Captured', value: '2,341' },
              { label: 'Geographic Reach', value: '127 cities' },
              { label: 'Avg Scans per SKU', value: '412' },
              { label: 'VIP Conversion Rate', value: '18.2%' },
              { label: 'Promo Entry Rate', value: '24.7%' },
            ].map((m, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                padding: '14px 0', borderBottom: '1px solid #1C1C21',
              }}>
                <span style={{ color: '#52525B', fontSize: '0.85rem' }}>{m.label}</span>
                <span style={{ color: '#FAFAFA', fontSize: '1.3rem', fontWeight: 800, letterSpacing: '-0.5px' }}>{m.value}</span>
              </div>
            ))}

            <div style={{ marginTop: 28 }}>
              <div style={{ fontSize: '0.7rem', color: '#3F3F46', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 12 }}>
                Weekly scan volume
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

      {/* Intelligence section */}
      <section style={{
        padding: '100px 40px', maxWidth: 1200, margin: '0 auto',
        borderTop: '1px solid #1C1C21',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#3F3F46', fontWeight: 600, letterSpacing: '3px', textTransform: 'uppercase', marginBottom: 16 }}>
              Built-in intelligence
            </div>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-1px', color: '#FAFAFA', marginBottom: 24 }}>
              Your data works while you don't
            </h2>
            <p style={{ color: '#52525B', fontSize: '1rem', lineHeight: 1.8, marginBottom: 16 }}>
              Captura continuously analyzes your scan data and surfaces what matters. Which products are gaining traction. Which regions are heating up. Where your VIP conversion is strong and where it needs attention. No digging through dashboards or building reports manually.
            </p>
            <p style={{ color: '#52525B', fontSize: '1rem', lineHeight: 1.8, marginBottom: 16 }}>
              On-demand intelligence reports break down product performance, geographic trends, and consumer behavior patterns. You get clear recommendations on where to double down and what to adjust.
            </p>
            <p style={{ color: '#52525B', fontSize: '1rem', lineHeight: 1.8 }}>
              The data you collect today informs the decisions you make tomorrow. Captura makes sure you never fall behind on what your consumers are telling you.
            </p>
          </div>

          {/* Sample report preview */}
          <div style={{
            background: '#131316', border: '1px solid #1C1C21', borderRadius: 16,
            padding: '32px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: '0.7rem', color: '#3F3F46', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>
                Weekly insights report
              </div>
              <div style={{ fontSize: '0.65rem', color: '#27272A' }}>Auto-generated</div>
            </div>

            {[
              { label: 'Top performing SKU', value: 'Performance Bat 34"', detail: 'Up 32% week over week' },
              { label: 'Fastest growing region', value: 'Southeast US', detail: 'Houston, Miami, Atlanta leading' },
              { label: 'VIP conversion trend', value: '18.2% → 21.4%', detail: 'Promo campaign driving signups' },
            ].map((item, i) => (
              <div key={i} style={{
                padding: '16px 0',
                borderBottom: i < 2 ? '1px solid #1C1C21' : 'none',
              }}>
                <div style={{ fontSize: '0.7rem', color: '#3F3F46', marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: '#FAFAFA', marginBottom: 2 }}>{item.value}</div>
                <div style={{ fontSize: '0.75rem', color: '#52525B' }}>{item.detail}</div>
              </div>
            ))}

            <div style={{
              marginTop: 20, padding: '14px 16px', borderRadius: 8,
              background: 'rgba(255,255,255,0.02)', border: '1px solid #1C1C21',
            }}>
              <div style={{ fontSize: '0.7rem', color: '#3F3F46', marginBottom: 6, fontWeight: 600 }}>RECOMMENDATION</div>
              <div style={{ fontSize: '0.85rem', color: '#A1A1AA', lineHeight: 1.6 }}>
                Increase QR placement on the 34" bat packaging. Southeast retailers are seeing high engagement. Consider a regional promo targeting Houston and Miami.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Double down section */}
      <section style={{
        padding: '100px 40px', maxWidth: 1200, margin: '0 auto',
        borderTop: '1px solid #1C1C21',
      }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: '#3F3F46', fontWeight: 600, letterSpacing: '3px', textTransform: 'uppercase', marginBottom: 16 }}>
            The compounding effect
          </div>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 800, lineHeight: 1.15, letterSpacing: '-1px', color: '#FAFAFA', marginBottom: 28 }}>
            Demographic data tells you the market. Consumer data lets you own it.
          </h2>
          <p style={{ color: '#52525B', fontSize: '1.05rem', lineHeight: 1.8, marginBottom: 20 }}>
            You already spend on retail data, market research, and ad platforms to understand your buyer. That gives you insight. What it does not give you is a contact list. Every product you sell with a Captura QR code turns insight into a named, reachable person. That database compounds with every unit shipped.
          </p>
          <p style={{ color: '#52525B', fontSize: '1.05rem', lineHeight: 1.8 }}>
            Brands that layer individual consumer data on top of their existing market intelligence will outpace competitors still relying on third-party reports and retailer POS summaries.
          </p>
        </div>
      </section>

      {/* Industry bar */}
      <section style={{
        padding: '60px 40px', maxWidth: 1200, margin: '0 auto',
        borderTop: '1px solid #1C1C21',
      }}>
        <div style={{ fontSize: '0.7rem', color: '#27272A', textAlign: 'center', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: 20 }}>
          Purpose-built for manufacturers in
        </div>
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 32, flexWrap: 'wrap',
          color: '#27272A', fontSize: '0.8rem', fontWeight: 600, letterSpacing: '1px',
        }}>
          {['SPORTING GOODS', 'APPAREL', 'CPG', 'FOOD & BEV', 'BEAUTY', 'ELECTRONICS', 'AUTO PARTS', 'SUPPLEMENTS'].map(ind => (
            <span key={ind}>{ind}</span>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ padding: '100px 40px 120px', textAlign: 'center' }}>
        <h2 style={{
          fontSize: 'clamp(2rem, 4vw, 3.2rem)', fontWeight: 800,
          lineHeight: 1.1, letterSpacing: '-1.5px', color: '#FAFAFA',
          maxWidth: 650, margin: '0 auto 20px',
        }}>
          You know the market. It's time to know the customer.
        </h2>
        <p style={{
          color: '#52525B', fontSize: '1.05rem',
          maxWidth: 480, margin: '0 auto 40px', lineHeight: 1.7,
        }}>
          Set up in minutes. First scan within the hour. Consumer data from day one.
        </p>
        <Link to="/login?signup=true" style={{
          display: 'inline-block', padding: '18px 48px', fontSize: '1.05rem',
          color: '#09090B', fontWeight: 700, background: '#FAFAFA', borderRadius: 10,
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

      <style>{`
        @media (max-width: 768px) {
          section { padding-left: 20px !important; padding-right: 20px !important; }
          section > div[style*="grid-template-columns: 1fr 1fr"],
          section[style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
            gap: 40px !important;
          }
          section > div[style*="grid-template-columns: repeat(3"],
          section > div[style*="grid-template-columns: repeat(4"] {
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
