// TEMPORARY diagnostic: reports only whether the functions runtime can
// see the admin allowlist, never the values. Delete after debugging.
export default async () => {
  const raw = process.env.ADMIN_EMAILS || process.env.VITE_ADMIN_EMAILS || ''
  const count = raw.split(',').map(e => e.trim()).filter(Boolean).length
  return new Response(JSON.stringify({
    sees_ADMIN_EMAILS: !!process.env.ADMIN_EMAILS,
    sees_VITE_ADMIN_EMAILS: !!process.env.VITE_ADMIN_EMAILS,
    allowlist_size: count,
  }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}
