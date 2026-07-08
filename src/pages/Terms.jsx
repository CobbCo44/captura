import { Link } from 'react-router-dom'

export default function Terms() {
  return (
    <div style={{ minHeight: '100vh', maxWidth: 700, margin: '0 auto', padding: '40px 24px' }}>
      <Link to="/" style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 24, display: 'block' }}>
        ← Back to Captura
      </Link>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: 24 }}>Terms of Service</h1>
      <div style={{ color: 'var(--text-muted)', lineHeight: 1.8, fontSize: '0.95rem' }}>
        <p style={{ marginBottom: 16 }}>Last updated: July 7, 2026</p>

        <h2 style={{ color: '#FAFAFA', fontSize: '1.2rem', fontWeight: 600, marginTop: 32, marginBottom: 12 }}>1. Acceptance of Terms</h2>
        <p style={{ marginBottom: 16 }}>By accessing or using Captura, you agree to be bound by these Terms of Service. If you do not agree, do not use the platform.</p>

        <h2 style={{ color: '#FAFAFA', fontSize: '1.2rem', fontWeight: 600, marginTop: 32, marginBottom: 12 }}>2. Description of Service</h2>
        <p style={{ marginBottom: 16 }}>Captura provides QR code-based consumer engagement tools for brands, including QR code generation, scan analytics, VIP member collection, and promotional campaign management.</p>

        <h2 style={{ color: '#FAFAFA', fontSize: '1.2rem', fontWeight: 600, marginTop: 32, marginBottom: 12 }}>3. User Accounts</h2>
        <p style={{ marginBottom: 16 }}>You are responsible for maintaining the security of your account credentials. You must provide accurate information when creating an account.</p>

        <h2 style={{ color: '#FAFAFA', fontSize: '1.2rem', fontWeight: 600, marginTop: 32, marginBottom: 12 }}>4. Data Collection</h2>
        <p style={{ marginBottom: 16 }}>Captura collects consumer data on behalf of brands, including names, phone numbers, email addresses, and geographic location data (with consumer consent). Brands are responsible for compliance with applicable data protection laws in their jurisdiction.</p>

        <h2 style={{ color: '#FAFAFA', fontSize: '1.2rem', fontWeight: 600, marginTop: 32, marginBottom: 12 }}>5. Acceptable Use</h2>
        <p style={{ marginBottom: 16 }}>You may not use Captura for any unlawful purpose, to distribute spam, or to collect data without proper consumer consent.</p>

        <h2 style={{ color: '#FAFAFA', fontSize: '1.2rem', fontWeight: 600, marginTop: 32, marginBottom: 12 }}>6. Limitation of Liability</h2>
        <p style={{ marginBottom: 16 }}>Captura is provided "as is" without warranties of any kind. We are not liable for any damages arising from your use of the platform.</p>

        <h2 style={{ color: '#FAFAFA', fontSize: '1.2rem', fontWeight: 600, marginTop: 32, marginBottom: 12 }}>7. Changes to Terms</h2>
        <p style={{ marginBottom: 16 }}>We may update these terms at any time. Continued use of the platform constitutes acceptance of the updated terms.</p>

        <h2 style={{ color: '#FAFAFA', fontSize: '1.2rem', fontWeight: 600, marginTop: 32, marginBottom: 12 }}>8. Contact</h2>
        <p style={{ marginBottom: 16 }}>For questions about these terms, contact us at support@captura.io.</p>
      </div>
    </div>
  )
}
