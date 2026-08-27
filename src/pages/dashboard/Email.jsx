import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function Email({ brand }) {
  // Autopilot state
  const [autopilot, setAutopilot] = useState({
    reward_ready: true, welcome: true, winback: true, winback_days: 30,
    reward_subject: '', reward_message: '',
    welcome_subject: '', welcome_message: '',
    winback_subject: '', winback_message: '',
  })
  const [autopilotSaving, setAutopilotSaving] = useState(false)
  const [autopilotSaved, setAutopilotSaved] = useState(false)
  const [autopilotStats, setAutopilotStats] = useState({ reward_ready: 0, welcome: 0, winback: 0, attribution: 0 })
  const [flowBreakdown, setFlowBreakdown] = useState({ reward_ready: 0, welcome: 0, winback: 0 })
  const [expandedFlow, setExpandedFlow] = useState(null)

  // Broadcast state
  const [broadcast, setBroadcast] = useState({ subject: '', message: '' })
  const [broadcastSending, setBroadcastSending] = useState(false)
  const [broadcastResult, setBroadcastResult] = useState(null)
  const [broadcastConfirm, setBroadcastConfirm] = useState(false)

  // Recent emails log
  const [recentEmails, setRecentEmails] = useState([])
  const [blastsThisMonth, setBlastsThisMonth] = useState(0)

  // Member count for broadcast confirm
  const [memberCount, setMemberCount] = useState(0)

  useEffect(() => {
    if (!brand) return
    setAutopilot({
      reward_ready: brand.autopilot_reward_ready !== false,
      welcome: brand.autopilot_welcome !== false,
      winback: brand.autopilot_winback !== false,
      winback_days: brand.winback_days ?? 30,
      reward_subject: brand.autopilot_reward_subject || '',
      reward_message: brand.autopilot_reward_message || '',
      welcome_subject: brand.autopilot_welcome_subject || '',
      welcome_message: brand.autopilot_welcome_message || '',
      winback_subject: brand.autopilot_winback_subject || '',
      winback_message: brand.autopilot_winback_message || '',
    })
    loadAutopilotStats()
    loadRecentEmails()
    loadMemberCount()
    loadBlastCount()
  }, [brand])

  async function loadBlastCount() {
    if (!supabase || !brand?.id || brand.id === 'demo') return
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const { data } = await supabase
      .from('autopilot_emails')
      .select('created_at')
      .eq('brand_id', brand.id)
      .eq('flow', 'broadcast')
      .eq('outcome', 'sent')
      .gte('created_at', thirtyDaysAgo.toISOString())
    if (data) {
      const uniqueBlasts = new Set(data.map(d => d.created_at.substring(0, 16)))
      setBlastsThisMonth(uniqueBlasts.size)
    }
  }

  async function loadMemberCount() {
    if (!supabase || !brand?.id || brand.id === 'demo') return
    const { data } = await supabase
      .from('loyalty_points')
      .select('contact_id')
      .eq('brand_id', brand.id)
    if (data) {
      setMemberCount(new Set(data.map(p => p.contact_id)).size)
    }
  }

  async function loadRecentEmails() {
    if (!supabase || !brand?.id || brand.id === 'demo') return
    const { data } = await supabase
      .from('autopilot_emails')
      .select('flow, outcome, error_detail, created_at')
      .eq('brand_id', brand.id)
      .order('created_at', { ascending: false })
      .limit(20)
    setRecentEmails(data || [])
  }

  async function loadAutopilotStats() {
    if (!supabase || !brand?.id || brand.id === 'demo') return
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const thirtyISO = thirtyDaysAgo.toISOString()

    const { data: sentEmails } = await supabase
      .from('autopilot_emails')
      .select('flow, created_at, contact_id')
      .eq('brand_id', brand.id)
      .eq('outcome', 'sent')
      .gte('created_at', thirtyISO)

    if (sentEmails) {
      const counts = { reward_ready: 0, welcome: 0, winback: 0 }
      for (const e of sentEmails) {
        if (counts[e.flow] !== undefined) counts[e.flow]++
      }
      setAutopilotStats(prev => ({ ...prev, ...counts }))

      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
      const emailContactDates = sentEmails.map(e => ({ contact_id: e.contact_id, sent_at: new Date(e.created_at) }))

      if (emailContactDates.length > 0) {
        const uniqueContacts = [...new Set(emailContactDates.map(e => e.contact_id))]
        const { data: earnedPoints } = await supabase
          .from('loyalty_points')
          .select('contact_id, created_at')
          .eq('brand_id', brand.id)
          .eq('type', 'earned')
          .in('contact_id', uniqueContacts)
          .gte('created_at', thirtyISO)

        if (earnedPoints) {
          const attributedContacts = new Set()
          const flowAttributed = { reward_ready: new Set(), welcome: new Set(), winback: new Set() }

          for (const point of earnedPoints) {
            const pointDate = new Date(point.created_at)
            for (const email of emailContactDates) {
              if (email.contact_id === point.contact_id && pointDate >= email.sent_at && (pointDate - email.sent_at) <= sevenDaysMs) {
                attributedContacts.add(point.contact_id)
                const matchingEmail = sentEmails.find(e => e.contact_id === email.contact_id && e.created_at === email.sent_at.toISOString())
                if (matchingEmail && flowAttributed[matchingEmail.flow]) {
                  flowAttributed[matchingEmail.flow].add(point.contact_id)
                }
                break
              }
            }
          }
          setAutopilotStats(prev => ({ ...prev, attribution: attributedContacts.size }))
          setFlowBreakdown({
            reward_ready: flowAttributed.reward_ready.size,
            welcome: flowAttributed.welcome.size,
            winback: flowAttributed.winback.size,
          })
        }
      }
    }
  }

  const saveAutopilot = async () => {
    if (!supabase || !brand?.id) return
    setAutopilotSaving(true)
    const { error } = await supabase.from('brands').update({
      autopilot_reward_ready: autopilot.reward_ready,
      autopilot_welcome: autopilot.welcome,
      autopilot_winback: autopilot.winback,
      winback_days: autopilot.winback_days,
      autopilot_reward_subject: autopilot.reward_subject || null,
      autopilot_reward_message: autopilot.reward_message || null,
      autopilot_welcome_subject: autopilot.welcome_subject || null,
      autopilot_welcome_message: autopilot.welcome_message || null,
      autopilot_winback_subject: autopilot.winback_subject || null,
      autopilot_winback_message: autopilot.winback_message || null,
    }).eq('id', brand.id)
    if (error) alert('Error saving: ' + error.message)
    else { setAutopilotSaved(true); setTimeout(() => setAutopilotSaved(false), 2000) }
    setAutopilotSaving(false)
  }

  const flowLabels = { reward_ready: 'Reward Ready', welcome: 'Welcome', winback: 'Win-Back', broadcast: 'Blast' }
  const outcomeColors = { sent: 'var(--success)', skipped_no_consent: '#fbbf24', skipped_dedup: 'var(--text-muted)', error: 'var(--danger)', skipped_disabled: 'var(--text-muted)' }

  const flows = [
    {
      key: 'reward_ready', label: 'Reward Ready', icon: '🎁',
      desc: 'When they earn a reward', count: autopilotStats.reward_ready,
      subjectKey: 'reward_subject', messageKey: 'reward_message',
      subjectDefault: 'You earned {reward}!',
      messageDefault: 'Hey {name}, you have enough points to redeem {reward} at {store}. Come visit to claim it!',
      placeholders: '{name}, {store}, {reward}, {points}',
    },
    {
      key: 'welcome', label: 'Welcome', icon: '👋',
      desc: 'When they first join', count: autopilotStats.welcome,
      subjectKey: 'welcome_subject', messageKey: 'welcome_message',
      subjectDefault: "You're in! Here's how loyalty works at {store}",
      messageDefault: 'Welcome to {store} loyalty, {name}! Earn 1 point every time you visit. You currently have {points} points.',
      placeholders: '{name}, {store}, {points}',
    },
    {
      key: 'winback', label: 'Win-Back', icon: '💌',
      desc: `After ${autopilot.winback_days}d inactive`, count: autopilotStats.winback,
      subjectKey: 'winback_subject', messageKey: 'winback_message',
      subjectDefault: "It's been a while, {name}!",
      messageDefault: "Hey {name}, you have {points} points waiting at {store}. Come visit and keep earning toward your next reward!",
      placeholders: '{name}, {store}, {points}, {reward}',
    },
  ]
  const activeFlow = flows.find(f => f.key === expandedFlow)

  // Tier enforcement: only for brands that have entered billing.
  // No subscription_status = founding free ride, everything unlocked.
  const billingActive = !!brand?.subscription_status
  const hasGrowth = !billingActive || ['growth', 'pro'].includes(brand?.tier)
  const lockedNotice = (feature) => (
    <div className="card" style={{ padding: '18px', textAlign: 'center' }}>
      <div style={{ fontSize: '1.4rem', marginBottom: 8 }}>🔒</div>
      <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 4 }}>{feature} is a Growth feature</div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', lineHeight: 1.6, marginBottom: 12 }}>
        Upgrade to Growth to turn it on. Your data and members are untouched either way.
      </p>
      <Link to="/dashboard/billing" className="btn btn-primary" style={{ display: 'inline-block', padding: '10px 24px', fontSize: '0.85rem' }}>
        Upgrade to Growth
      </Link>
    </div>
  )

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700 }}>Email</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
          Autopilot emails and blasts for your loyalty members
        </p>
      </div>

      {/* Attribution headline */}
      {autopilotStats.attribution > 0 && (
        <div style={{
          padding: '14px 18px', borderRadius: 10, marginBottom: 20,
          background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.2)',
        }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--success)' }}>
            Autopilot brought back {autopilotStats.attribution} customer{autopilotStats.attribution === 1 ? '' : 's'} this month
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
            {[
              flowBreakdown.reward_ready > 0 && `${flowBreakdown.reward_ready} from Reward Ready`,
              flowBreakdown.welcome > 0 && `${flowBreakdown.welcome} from Welcome`,
              flowBreakdown.winback > 0 && `${flowBreakdown.winback} from Win-Back`,
            ].filter(Boolean).join(' · ') || 'Members who visited within 7 days of an autopilot email'}
          </div>
        </div>
      )}

      {/* Two-column layout: Autopilot left, Blast right */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24, alignItems: 'start' }}>

        {/* Autopilot flows */}
        <div>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            Autopilot Flows
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {flows.map(flow => {
              const isSelected = expandedFlow === flow.key
              return (
                <div key={flow.key}
                  onClick={() => setExpandedFlow(isSelected ? null : flow.key)}
                  style={{
                    padding: '14px 16px', borderRadius: 10, cursor: 'pointer',
                    background: isSelected ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.03)',
                    border: isSelected ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: '1.2rem' }}>{flow.icon}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{flow.label}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {flow.desc}{flow.count > 0 ? ` · ${flow.count} sent` : ''}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', opacity: 0.5 }}>
                      {isSelected ? '▲' : '✎'}
                    </span>
                    {flow.key === 'winback' && !hasGrowth ? (
                      <span style={{ fontSize: '0.9rem' }} title="Growth feature">🔒</span>
                    ) : (
                    <div
                      onClick={e => { e.stopPropagation(); setAutopilot(prev => ({ ...prev, [flow.key]: !prev[flow.key] })) }}
                      style={{
                        width: 44, height: 24, borderRadius: 12, cursor: 'pointer',
                        background: autopilot[flow.key] ? 'var(--success)' : '#3F3F46',
                        position: 'relative', transition: 'background 0.2s',
                      }}
                    >
                      <div style={{
                        width: 18, height: 18, borderRadius: '50%', background: 'white',
                        position: 'absolute', top: 3,
                        left: autopilot[flow.key] ? 23 : 3,
                        transition: 'left 0.2s',
                      }} />
                    </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Editor panel */}
          {activeFlow && (
            <div style={{
              padding: '16px', marginTop: 10, borderRadius: 10,
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.12)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Customize {activeFlow.label}</div>
                <button onClick={() => setExpandedFlow(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem' }}>Done</button>
              </div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Subject</label>
              <input className="input" placeholder={activeFlow.subjectDefault}
                value={autopilot[activeFlow.subjectKey]}
                onChange={e => setAutopilot(prev => ({ ...prev, [activeFlow.subjectKey]: e.target.value }))}
                style={{ fontSize: '0.82rem', padding: '8px 10px', marginBottom: 10 }} />
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Message</label>
              <textarea className="input" placeholder={activeFlow.messageDefault}
                value={autopilot[activeFlow.messageKey]}
                onChange={e => setAutopilot(prev => ({ ...prev, [activeFlow.messageKey]: e.target.value }))}
                rows={3} style={{ fontSize: '0.82rem', padding: '8px 10px', resize: 'vertical', marginBottom: 6 }} />
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', opacity: 0.7 }}>
                Leave blank for defaults. Placeholders: {activeFlow.placeholders}
              </div>
            </div>
          )}

          {/* Winback days */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, padding: '0 4px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Win-back after</span>
            <input className="input" type="number" min="7" max="180"
              value={autopilot.winback_days}
              onChange={e => setAutopilot(prev => ({ ...prev, winback_days: parseInt(e.target.value) || 30 }))}
              style={{ width: 60, fontSize: '0.85rem', padding: '6px 8px', textAlign: 'center' }} />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>days inactive</span>
          </div>

          <button className="btn btn-primary" onClick={saveAutopilot} disabled={autopilotSaving}
            style={{ fontSize: '0.85rem', padding: '10px 24px', marginTop: 16 }}>
            {autopilotSaving ? 'Saving...' : autopilotSaved ? 'Saved!' : 'Save'}
          </button>
        </div>

        {/* Blast */}
        {!hasGrowth ? lockedNotice('Announcements') : (
        <div className="card">
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 4 }}>Send a Blast</h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.5 }}>
            One-time email to all {memberCount || 'your'} loyalty members with consent. Flash sales, special hours, announcements.
          </p>
          <div style={{ fontSize: '0.75rem', color: blastsThisMonth >= 4 ? 'var(--danger)' : 'var(--text-muted)', marginBottom: 14 }}>
            {4 - blastsThisMonth} of 4 blasts remaining this month
          </div>

          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Subject</label>
          <input className="input" placeholder="e.g. Half off everything for the next 6 hours!"
            value={broadcast.subject}
            onChange={e => setBroadcast(prev => ({ ...prev, subject: e.target.value }))}
            style={{ marginBottom: 10 }} />

          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Message</label>
          <textarea className="input"
            placeholder={`Hey {name}, we're running a surprise flash sale at {store} today only!`}
            value={broadcast.message}
            onChange={e => setBroadcast(prev => ({ ...prev, message: e.target.value }))}
            rows={4} style={{ resize: 'vertical', marginBottom: 6 }} />
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 14, opacity: 0.7 }}>
            Placeholders: {'{name}'}, {'{store}'}
          </div>

          {broadcastResult && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, marginBottom: 14,
              background: broadcastResult.error ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.08)',
              border: broadcastResult.error ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(34, 197, 94, 0.2)',
            }}>
              {broadcastResult.error ? (
                <div style={{ fontSize: '0.82rem', color: 'var(--danger)' }}>{broadcastResult.error}</div>
              ) : (
                <div style={{ fontSize: '0.82rem' }}>
                  <strong style={{ color: 'var(--success)' }}>{broadcastResult.sent} sent</strong>
                  {broadcastResult.skipped > 0 && <span style={{ color: 'var(--text-muted)' }}> · {broadcastResult.skipped} skipped</span>}
                  {broadcastResult.error_count > 0 && <span style={{ color: 'var(--danger)' }}> · {broadcastResult.error_count} errors</span>}
                </div>
              )}
            </div>
          )}

          {!broadcastConfirm ? (
            <button className="btn btn-primary"
              disabled={broadcastSending || !broadcast.subject.trim() || !broadcast.message.trim() || blastsThisMonth >= 4}
              onClick={() => setBroadcastConfirm(true)}
              style={{ fontSize: '0.85rem', padding: '10px 24px' }}
            >
              Send to All Members
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button className="btn btn-primary"
                disabled={broadcastSending}
                onClick={async () => {
                  setBroadcastSending(true)
                  setBroadcastResult(null)
                  setBroadcastConfirm(false)
                  try {
                    const res = await fetch('/.netlify/functions/send-broadcast', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ brand_id: brand.id, subject: broadcast.subject, message: broadcast.message }),
                    })
                    const data = await res.json()
                    setBroadcastResult(data)
                    if (data.sent > 0) { setBroadcast({ subject: '', message: '' }); loadRecentEmails(); loadBlastCount() }
                  } catch { setBroadcastResult({ error: 'Failed to send. Please try again.' }) }
                  setBroadcastSending(false)
                }}
                style={{ fontSize: '0.85rem', padding: '10px 24px', background: '#ef4444' }}
              >
                {broadcastSending ? 'Sending...' : `Yes, email ${memberCount || 'all'} members now`}
              </button>
              <button onClick={() => setBroadcastConfirm(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem' }}>
                Cancel
              </button>
            </div>
          )}
        </div>
        )}
      </div>

      {/* Recent email log */}
      {recentEmails.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0 }}>Recent Emails</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Flow', 'Outcome', 'Detail', 'Time'].map(h => (
                    <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentEmails.map((e, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 14px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 600, background: 'rgba(255,255,255,0.06)' }}>
                        {flowLabels[e.flow] || e.flow}
                      </span>
                    </td>
                    <td style={{ padding: '8px 14px' }}>
                      <span style={{ color: outcomeColors[e.outcome] || 'var(--text-muted)', fontWeight: 600 }}>
                        {e.outcome === 'sent' ? 'Sent' : e.outcome === 'skipped_no_consent' ? 'No Consent' : e.outcome === 'skipped_dedup' ? 'Skipped' : e.outcome === 'error' ? 'Error' : e.outcome}
                      </span>
                    </td>
                    <td style={{ padding: '8px 14px', color: 'var(--text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {e.error_detail || '—'}
                    </td>
                    <td style={{ padding: '8px 14px', color: 'var(--text-muted)' }}>
                      {new Date(e.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
