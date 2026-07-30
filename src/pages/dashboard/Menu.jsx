import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function Menu({ brand }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700 }}>Menu / Services</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
            Manage what customers see when they scan your QR code
          </p>
        </div>
      </div>

      <div className="card" style={{ textAlign: 'center', padding: 60 }}>
        <div style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 8 }}>Coming Soon</div>
        <p style={{ color: 'var(--text-muted)' }}>
          Build your menu or services list here. Customers will see this when they scan your QR code.
        </p>
      </div>
    </div>
  )
}
