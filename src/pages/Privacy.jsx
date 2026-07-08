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

        <h2 style={{ color: '#FAFAFA', fontSize: '1.2rem', fontWeight: 600, marginTop: 32, marginBottom: 12 }}>Information We Collect</h2>
        <p style={{ marginBottom: 16 }}>When consumers scan a QR code, we may collect geographic location (with permission), device type, and timestamp. When consumers voluntarily sign up as VIP members or enter promotions, we collect first name, last name, phone number, and optionally email address.</p>

        <h2 style={{ color: '#FAFAFA', fontSize: '1.2rem', fontWeight: 600, marginTop: 32, marginBottom: 12 }}>How We Use Your Data</h2>
        <p style={{ marginBottom: 16 }}>Consumer data is used to provide brands with engagement analytics and to facilitate direct communication between brands and their consumers. Location data helps brands understand where their products are being used.</p>

        <h2 style={{ color: '#FAFAFA', fontSize: '1.2rem', fontWeight: 600, marginTop: 32, marginBottom: 12 }}>Data Sharing</h2>
        <p style={{ marginBottom: 16 }}>Consumer data collected through QR code scans is shared with the brand that created the QR code. We do not sell personal data to third parties.</p>

        <h2 style={{ color: '#FAFAFA', fontSize: '1.2rem', fontWeight: 600, marginTop: 32, marginBottom: 12 }}>Location Data</h2>
        <p style={{ marginBottom: 16 }}>Location data is only collected when the consumer grants permission through their browser. Consumers can deny location access and still use all other features.</p>

        <h2 style={{ color: '#FAFAFA', fontSize: '1.2rem', fontWeight: 600, marginTop: 32, marginBottom: 12 }}>Data Retention</h2>
        <p style={{ marginBottom: 16 }}>We retain consumer data for as long as the brand account is active. Brands can request deletion of their data at any time.</p>

        <h2 style={{ color: '#FAFAFA', fontSize: '1.2rem', fontWeight: 600, marginTop: 32, marginBottom: 12 }}>Your Rights</h2>
        <p style={{ marginBottom: 16 }}>You may request access to, correction of, or deletion of your personal data by contacting us at privacy@captura.io.</p>

        <h2 style={{ color: '#FAFAFA', fontSize: '1.2rem', fontWeight: 600, marginTop: 32, marginBottom: 12 }}>Contact</h2>
        <p style={{ marginBottom: 16 }}>For privacy-related questions, contact us at privacy@captura.io.</p>
      </div>
    </div>
  )
}
