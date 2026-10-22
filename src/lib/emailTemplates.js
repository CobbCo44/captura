// Email HTML shared by the Netlify email functions and the dashboard preview,
// so what an owner previews is exactly what members receive. Pure functions only:
// this file is bundled into both the browser app and the functions.

export function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function isHttpUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

/**
 * Build the branded email HTML shell.
 * All flows share the same outer structure: logo, accent color, footer with unsub link.
 */
export function buildEmailHtml({ brand, subject, bodyHtml, unsubUrl }) {
  const logoUrl = brand.logo_dark_url || brand.logo_url

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
<tr><td align="center">
<table width="100%" style="max-width:480px;background:#ffffff;border-radius:12px;overflow:hidden;">
  ${logoUrl ? `<tr><td style="padding:24px 24px 0;text-align:center;"><img src="${logoUrl}" alt="${brand.name}" style="max-height:48px;max-width:200px;"></td></tr>` : ''}
  <tr><td style="padding:24px;text-align:center;">
    ${bodyHtml}
  </td></tr>
  <tr><td style="padding:16px 24px 24px;text-align:center;border-top:1px solid #f4f4f5;">
    <p style="margin:0;font-size:11px;color:#a1a1aa;">
      You're receiving this because you opted in to marketing communications from ${brand.name} via MeetCaptura.<br>
      <a href="${unsubUrl}" style="color:#a1a1aa;text-decoration:underline;">Unsubscribe</a>
    </p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`
}

/**
 * Fill {name} / {store} placeholders in a blast's subject or message.
 */
export function fillBroadcastText(text, { firstName, storeName }) {
  return String(text || '')
    .replace(/\{name\}/gi, firstName)
    .replace(/\{store\}/gi, storeName)
}

/**
 * Inner body of a blast email: optional photo, headline, message, button.
 * Owner-entered text is escaped; with no custom button it links to the store page.
 */
export function buildBroadcastBody({ brand, subject, message, imageUrl, buttonText, buttonUrl }) {
  const accentColor = brand.accent_hex || '#22c55e'
  const hasCustomButton = buttonText && isHttpUrl(buttonUrl)
  const ctaText = hasCustomButton ? buttonText : `Visit ${brand.name}`
  const ctaUrl = hasCustomButton ? buttonUrl : `https://meetcaptura.com/store/${brand.id}`

  const image = imageUrl && isHttpUrl(imageUrl)
    ? `<img src="${escapeHtml(imageUrl)}" alt="" width="432" style="display:block;width:100%;max-width:432px;height:auto;border-radius:10px;margin:0 auto 20px;">`
    : `<div style="font-size:32px;margin-bottom:8px;">&#128227;</div>`

  return `
      ${image}
      <h1 style="margin:0 0 8px;font-size:22px;color:#18181b;">${escapeHtml(subject)}</h1>
      <p style="margin:0 0 20px;font-size:16px;color:#52525b;white-space:pre-line;">${escapeHtml(message)}</p>
      <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;margin-top:12px;padding:14px 32px;background:${accentColor};color:#ffffff;font-weight:700;font-size:16px;text-decoration:none;border-radius:10px;">${escapeHtml(ctaText)}</a>`
}
