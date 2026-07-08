import { Link } from 'react-router-dom'

export default function Privacy() {
  return (
    <div style={{ minHeight: '100vh', maxWidth: 700, margin: '0 auto', padding: '40px 24px' }}>
      <Link to="/" style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 24, display: 'block' }}>
        ← Back to Captura
      </Link>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: 24 }}>Privacy Policy</h1>
      <div style={{ color: 'var(--text-muted)', lineHeight: 1.8, fontSize: '0.95rem' }}>
        <p style={{ marginBottom: 16 }}>Last updated: July 7, 2026</p>
        <p style={{ marginBottom: 16 }}>Captura ("we," "us," "our") operates the meetcaptura.com platform. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform, either as a brand customer or as a consumer interacting with QR codes.</p>

        <h2 style={{ color: '#FAFAFA', fontSize: '1.2rem', fontWeight: 600, marginTop: 32, marginBottom: 12 }}>Information We Collect Automatically</h2>
        <p style={{ marginBottom: 16 }}>When a consumer scans a QR code powered by Captura, we automatically collect:</p>
        <ul style={{ marginBottom: 16, paddingLeft: 20 }}>
          <li style={{ marginBottom: 8 }}>Approximate geographic location derived from your IP address (city, state/region, country)</li>
          <li style={{ marginBottom: 8 }}>Device type (e.g., iPhone, Android)</li>
          <li style={{ marginBottom: 8 }}>Browser user agent</li>
          <li style={{ marginBottom: 8 }}>Date and time of the scan</li>
        </ul>
        <p style={{ marginBottom: 16 }}>This data is collected without requiring any action from the consumer beyond scanning the QR code. We do not use GPS or request precise location permissions. Location data is derived from your IP address and is approximate (city-level).</p>

        <h2 style={{ color: '#FAFAFA', fontSize: '1.2rem', fontWeight: 600, marginTop: 32, marginBottom: 12 }}>Information You Provide Voluntarily</h2>
        <p style={{ marginBottom: 16 }}>If you choose to sign up as a VIP member or enter a promotional campaign, you voluntarily provide:</p>
        <ul style={{ marginBottom: 16, paddingLeft: 20 }}>
          <li style={{ marginBottom: 8 }}>First and last name</li>
          <li style={{ marginBottom: 8 }}>Phone number</li>
          <li style={{ marginBottom: 8 }}>Email address (optional)</li>
        </ul>
        <p style={{ marginBottom: 16 }}>By submitting this information, you consent to receiving communications from the brand whose product you scanned, including promotional messages, product updates, and marketing materials via text message, email, or phone call. You must be 18 years or older to submit your information.</p>

        <h2 style={{ color: '#FAFAFA', fontSize: '1.2rem', fontWeight: 600, marginTop: 32, marginBottom: 12 }}>How We Use Your Information</h2>
        <ul style={{ marginBottom: 16, paddingLeft: 20 }}>
          <li style={{ marginBottom: 8 }}>To provide scan analytics and consumer insights to the brand that created the QR code</li>
          <li style={{ marginBottom: 8 }}>To enable brands to communicate directly with consumers who have opted in</li>
          <li style={{ marginBottom: 8 }}>To facilitate promotional campaigns and prize drawings</li>
          <li style={{ marginBottom: 8 }}>To generate aggregated, anonymized analytics across the platform</li>
          <li style={{ marginBottom: 8 }}>To improve our platform and services</li>
        </ul>

        <h2 style={{ color: '#FAFAFA', fontSize: '1.2rem', fontWeight: 600, marginTop: 32, marginBottom: 12 }}>How We Share Your Information</h2>
        <p style={{ marginBottom: 16 }}>Consumer data collected through QR code scans is shared with the brand that created the QR code. This includes scan location data, device information, and any personal information you voluntarily provide (name, phone, email).</p>
        <p style={{ marginBottom: 16 }}>We may use aggregated, de-identified data for platform analytics and industry benchmarking. This data cannot be used to identify any individual consumer.</p>
        <p style={{ marginBottom: 16 }}>We do not sell your personal information to third parties unrelated to the brand whose QR code you scanned.</p>

        <h2 style={{ color: '#FAFAFA', fontSize: '1.2rem', fontWeight: 600, marginTop: 32, marginBottom: 12 }}>Opting Out</h2>
        <p style={{ marginBottom: 16 }}>If you have provided your phone number or email, you may opt out of communications at any time:</p>
        <ul style={{ marginBottom: 16, paddingLeft: 20 }}>
          <li style={{ marginBottom: 8 }}>Text: Reply STOP to any text message</li>
          <li style={{ marginBottom: 8 }}>Email: Click the unsubscribe link in any email</li>
          <li style={{ marginBottom: 8 }}>Contact us: privacy@meetcaptura.com</li>
        </ul>

        <h2 style={{ color: '#FAFAFA', fontSize: '1.2rem', fontWeight: 600, marginTop: 32, marginBottom: 12 }}>Your Rights (California and Other States)</h2>
        <p style={{ marginBottom: 16 }}>Depending on your jurisdiction, you may have the right to:</p>
        <ul style={{ marginBottom: 16, paddingLeft: 20 }}>
          <li style={{ marginBottom: 8 }}>Request access to the personal information we hold about you</li>
          <li style={{ marginBottom: 8 }}>Request correction of inaccurate information</li>
          <li style={{ marginBottom: 8 }}>Request deletion of your personal information</li>
          <li style={{ marginBottom: 8 }}>Opt out of the sale or sharing of your personal information</li>
        </ul>
        <p style={{ marginBottom: 16 }}>To exercise any of these rights, contact us at privacy@meetcaptura.com. We will respond within 45 days.</p>

        <h2 style={{ color: '#FAFAFA', fontSize: '1.2rem', fontWeight: 600, marginTop: 32, marginBottom: 12 }}>Data Retention</h2>
        <p style={{ marginBottom: 16 }}>We retain consumer data for as long as the brand account that collected it remains active on our platform, or until the consumer requests deletion.</p>

        <h2 style={{ color: '#FAFAFA', fontSize: '1.2rem', fontWeight: 600, marginTop: 32, marginBottom: 12 }}>Children's Privacy</h2>
        <p style={{ marginBottom: 16 }}>Our platform is not intended for use by individuals under 18 years of age. We do not knowingly collect personal information from minors. If you believe we have collected data from a minor, contact us at privacy@meetcaptura.com and we will delete it promptly.</p>

        <h2 style={{ color: '#FAFAFA', fontSize: '1.2rem', fontWeight: 600, marginTop: 32, marginBottom: 12 }}>Data Security</h2>
        <p style={{ marginBottom: 16 }}>We use industry-standard security measures to protect your data, including encryption in transit and at rest. However, no method of electronic transmission or storage is 100% secure.</p>

        <h2 style={{ color: '#FAFAFA', fontSize: '1.2rem', fontWeight: 600, marginTop: 32, marginBottom: 12 }}>Changes to This Policy</h2>
        <p style={{ marginBottom: 16 }}>We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated "Last updated" date.</p>

        <h2 style={{ color: '#FAFAFA', fontSize: '1.2rem', fontWeight: 600, marginTop: 32, marginBottom: 12 }}>Contact Us</h2>
        <p style={{ marginBottom: 16 }}>
          Captura<br />
          Email: privacy@meetcaptura.com
        </p>
      </div>
    </div>
  )
}
