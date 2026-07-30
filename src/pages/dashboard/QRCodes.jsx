import { useState, useEffect } from 'react'
import { supabase, generateShortId } from '../../lib/supabase'
import BrandedQR from '../../components/BrandedQR'
import generateQRCode from 'qr.js'
import { buildGS1DigitalLink } from '../../lib/gs1'
import { jsPDF } from 'jspdf'

export default function QRCodes({ brand }) {
  const [qrCodes, setQrCodes] = useState([])
  const [products, setProducts] = useState([])
  const [channels, setChannels] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingQR, setEditingQR] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    productId: '',
    channelId: '',
    fgColor: '#18181B',
    bgColor: '#FFFFFF',
    logoFile: null,
    logoRawFile: null,
    existingLogoUrl: null,
    logoScale: 0.25,
    ctaText: '',
  })
  const [showAddChannel, setShowAddChannel] = useState(false)
  const [showManageChannels, setShowManageChannels] = useState(false)
  const [newChannelName, setNewChannelName] = useState('')
  const [newChannelType, setNewChannelType] = useState('retail')
  const [downloadModal, setDownloadModal] = useState(null) // { qr, format: 'png'|'svg' }
  const [sheetSize, setSheetSize] = useState('1.5')
  const [sheetQty, setSheetQty] = useState(20)
  const [generating, setGenerating] = useState(false)

  const scanUrl = 'https://meetcaptura.com'

  // Build the right URL: GS1 Digital Link when GTIN exists, plain /s/ otherwise.
  // The short_id rides in the serial qualifier (/21/) so per-code tracking is preserved.
  function buildScanUrl(shortId, gtin) {
    if (gtin) {
      return buildGS1DigitalLink(scanUrl, gtin, { serial: shortId })
    }
    return `${scanUrl}/s/${shortId}`
  }

  useEffect(() => {
    loadData()
  }, [brand])

  async function loadData() {
    if (!supabase || !brand?.id || brand.id === 'demo') {
      setQrCodes([])
      setProducts([])
      setLoading(false)
      return
    }
    const [qrRes, prodRes, scansRes, channelRes] = await Promise.all([
      supabase.from('qr_codes').select('*, products(name, sku, gtin), channels:channel_id(id, name, type)').eq('brand_id', brand.id).is('event_id', null).order('created_at', { ascending: false }),
      supabase.from('products').select('id, name, sku, gtin').eq('brand_id', brand.id).order('name'),
      supabase.from('scans').select('qr_code_id').eq('brand_id', brand.id),
      supabase.from('channels').select('*').eq('brand_id', brand.id).order('name'),
    ])
    // Count scans per QR code
    const scanCounts = {}
    ;(scansRes.data || []).forEach(s => {
      scanCounts[s.qr_code_id] = (scanCounts[s.qr_code_id] || 0) + 1
    })
    const qrWithCounts = (qrRes.data || []).map(qr => ({
      ...qr, scan_count: scanCounts[qr.id] || 0
    }))
    setQrCodes(qrWithCounts)
    setProducts(prodRes.data || [])
    setChannels(channelRes.data || [])
    setLoading(false)
  }

  const openCreate = () => {
    setEditingQR(null)
    setForm({ productId: '', channelId: '', fgColor: '#18181B', bgColor: '#FFFFFF', logoFile: null, logoRawFile: null, existingLogoUrl: null, logoScale: 0.25, ctaText: '' })
    setShowModal(true)
  }

  const openEdit = (qr) => {
    setEditingQR(qr)
    setForm({
      productId: qr.product_id,
      channelId: qr.channel_id || '',
      fgColor: qr.fg_color || '#18181B',
      bgColor: qr.bg_color || '#FFFFFF',
      logoFile: qr.logo_url || null,
      logoRawFile: null,
      existingLogoUrl: qr.logo_url || null,
      logoScale: qr.logo_scale || 0.25,
      ctaText: qr.cta_text || '',
    })
    setShowModal(true)
  }

  const handleLogoUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setForm({ ...form, logoFile: ev.target.result, logoRawFile: file, existingLogoUrl: null })
    }
    reader.readAsDataURL(file)
  }

  const removeLogo = () => {
    setForm({ ...form, logoFile: null, logoRawFile: null, existingLogoUrl: null })
  }

  async function addChannel() {
    if (!supabase || !brand?.id || !newChannelName.trim()) return
    const { data, error } = await supabase
      .from('channels')
      .insert({ brand_id: brand.id, name: newChannelName.trim(), type: newChannelType })
      .select()
      .single()
    if (error) {
      alert(`Error creating channel: ${error.message}`)
      return
    }
    setChannels(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    setForm({ ...form, channelId: data.id })
    setNewChannelName('')
    setNewChannelType('retail')
    setShowAddChannel(false)
  }

  async function deleteChannel(channelId, channelName) {
    if (!supabase) return
    if (!window.confirm(`Delete channel "${channelName}"?`)) return
    const { error } = await supabase.rpc('delete_channel', { p_channel_id: channelId })
    if (error) {
      alert('Failed to delete channel: ' + error.message)
      return
    }
    setChannels(prev => prev.filter(ch => ch.id !== channelId))
    if (form.channelId === channelId) setForm({ ...form, channelId: '' })
  }

  async function uploadLogo() {
    if (!form.logoRawFile || !supabase || !brand?.id) return null

    const fileExt = form.logoRawFile.name.split('.').pop()
    const fileName = `${brand.id}/qr-logo-${Date.now()}.${fileExt}`
    const { error } = await supabase.storage
      .from('product-images')
      .upload(fileName, form.logoRawFile)

    if (error) {
      console.error('Logo upload error:', error)
      return null
    }

    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName)
    return urlData.publicUrl
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!supabase || !brand?.id || brand.id === 'demo') return
    setSaving(true)

    // Upload logo if new file selected
    let logoUrl = form.existingLogoUrl || null
    if (form.logoRawFile) {
      const uploaded = await uploadLogo()
      if (uploaded) logoUrl = uploaded
    }

    const qrData = {
      fg_color: form.fgColor,
      bg_color: form.bgColor,
      logo_url: logoUrl,
      logo_scale: form.logoScale,
      cta_text: form.ctaText || null,
      channel_id: form.channelId || null,
    }

    if (editingQR) {
      // Update
      const { data, error } = await supabase.from('qr_codes')
        .update({ ...qrData, product_id: form.productId })
        .eq('id', editingQR.id)
        .select('*, products(name, sku, gtin), channels:channel_id(id, name, type)').single()

      if (error) {
        alert(`Error updating QR code: ${error.message}`)
      } else if (data) {
        setQrCodes(qrCodes.map(q => q.id === data.id ? data : q))
      }
    } else {
      // Create
      const shortId = generateShortId()
      const { data, error } = await supabase.from('qr_codes').insert({
        brand_id: brand.id,
        product_id: form.productId,
        short_id: shortId,
        ...qrData,
      }).select('*, products(name, sku, gtin), channels:channel_id(id, name, type)').single()

      if (error) {
        alert(`Error creating QR code: ${error.message}`)
      } else if (data) {
        setQrCodes([data, ...qrCodes])
      }
    }

    setForm({ productId: '', channelId: '', fgColor: '#18181B', bgColor: '#FFFFFF', logoFile: null, logoRawFile: null, existingLogoUrl: null, logoScale: 0.25, ctaText: '' })
    setEditingQR(null)
    setShowModal(false)
    setSaving(false)
  }

  const handleDelete = async (qr) => {
    if (!confirm(`Delete QR code for ${qr.products?.name || 'this product'}?`)) return
    if (supabase) {
      await supabase.from('qr_codes').delete().eq('id', qr.id)
    }
    setQrCodes(qrCodes.filter(q => q.id !== qr.id))
  }

  const downloadPNG = (shortId, productName, qr) => {
    const code = generateQRCode(buildScanUrl(shortId, qr.products?.gtin))
    if (!code) return
    const matrix = code.modules
    const gridSize = matrix.length
    const hiResSize = 1000
    const modSize = hiResSize / gridSize

    const ctaText = qr.cta_text || ''
    const bannerHeight = ctaText ? hiResSize * 0.12 : 0
    const totalHeight = hiResSize + bannerHeight

    const hiRes = document.createElement('canvas')
    hiRes.width = hiResSize
    hiRes.height = totalHeight
    const ctx = hiRes.getContext('2d')

    // Background
    ctx.fillStyle = qr.bg_color || '#FFFFFF'
    ctx.fillRect(0, 0, hiResSize, totalHeight)

    // Draw QR modules at native high resolution
    ctx.fillStyle = qr.fg_color || '#18181B'
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        if (!matrix[y][x]) continue
        ctx.fillRect(x * modSize, y * modSize, modSize, modSize)
      }
    }

    // CTA banner
    if (ctaText) {
      ctx.fillStyle = qr.fg_color || '#18181B'
      ctx.fillRect(0, hiResSize, hiResSize, bannerHeight)
      ctx.fillStyle = qr.bg_color || '#FFFFFF'
      ctx.font = `bold ${bannerHeight * 0.5}px Inter, -apple-system, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(ctaText.toUpperCase(), hiResSize / 2, hiResSize + bannerHeight / 2)
    }

    const finishDownload = () => {
      const link = document.createElement('a')
      link.download = `${productName || shortId}-qr.png`
      link.href = hiRes.toDataURL('image/png')
      link.click()
    }

    // Draw logo if present
    const logoUrl = qr.logo_url
    if (logoUrl) {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const logoScale = qr.logo_scale || 0.25
        const logoSize = hiResSize * logoScale
        const logoPos = (hiResSize - logoSize) / 2
        const padding = logoSize * 0.12

        ctx.fillStyle = qr.bg_color || '#FFFFFF'
        roundRect(ctx, logoPos - padding, logoPos - padding,
          logoSize + padding * 2, logoSize + padding * 2, 12)
        ctx.fill()
        ctx.drawImage(img, logoPos, logoPos, logoSize, logoSize)
        finishDownload()
      }
      img.onerror = () => finishDownload()
      img.src = logoUrl
    } else {
      finishDownload()
    }
  }

  const downloadSVG = (shortId, productName, qr) => {
    const code = generateQRCode(buildScanUrl(shortId, qr.products?.gtin))
    if (!code) return
    const matrix = code.modules
    const gridSize = matrix.length
    const modSize = 10
    const svgSize = gridSize * modSize
    const fgColor = qr.fg_color || '#18181B'
    const bgColor = qr.bg_color || '#FFFFFF'

    const ctaText = qr.cta_text || ''
    const bannerHeight = ctaText ? Math.round(svgSize * 0.12) : 0
    const totalHeight = svgSize + bannerHeight

    let rects = ''
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        if (!matrix[y][x]) continue
        rects += `<rect x="${x * modSize}" y="${y * modSize}" width="${modSize}" height="${modSize}" fill="${fgColor}"/>`
      }
    }

    let ctaSvg = ''
    if (ctaText) {
      ctaSvg = `<rect y="${svgSize}" width="${svgSize}" height="${bannerHeight}" fill="${fgColor}"/>
        <text x="${svgSize / 2}" y="${svgSize + bannerHeight / 2}" fill="${bgColor}" font-family="Inter, -apple-system, sans-serif" font-weight="bold" font-size="${bannerHeight * 0.5}" text-anchor="middle" dominant-baseline="central">${ctaText.toUpperCase()}</text>`
    }

    const buildSVG = (logoData) => {
      let logoSvg = ''
      if (logoData) {
        const logoScale = qr.logo_scale || 0.25
        const logoSize = svgSize * logoScale
        const logoPos = (svgSize - logoSize) / 2
        const padding = logoSize * 0.12
        logoSvg = `<rect x="${logoPos - padding}" y="${logoPos - padding}" width="${logoSize + padding * 2}" height="${logoSize + padding * 2}" rx="4" ry="4" fill="${bgColor}"/>
          <image x="${logoPos}" y="${logoPos}" width="${logoSize}" height="${logoSize}" href="${logoData}"/>`
      }

      const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${svgSize}" height="${totalHeight}" viewBox="0 0 ${svgSize} ${totalHeight}">
        <rect width="${svgSize}" height="${totalHeight}" fill="${bgColor}"/>
        ${rects}
        ${logoSvg}
        ${ctaSvg}
      </svg>`

      const blob = new Blob([svg], { type: 'image/svg+xml' })
      const link = document.createElement('a')
      link.download = `${productName || shortId}-qr.svg`
      link.href = URL.createObjectURL(blob)
      link.click()
      URL.revokeObjectURL(link.href)
    }

    // Embed logo as base64 so it works offline
    if (qr.logo_url) {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const c = document.createElement('canvas')
        c.width = img.naturalWidth
        c.height = img.naturalHeight
        c.getContext('2d').drawImage(img, 0, 0)
        buildSVG(c.toDataURL('image/png'))
      }
      img.onerror = () => buildSVG(null)
      img.src = qr.logo_url
    } else {
      buildSVG(null)
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
  }

  // Render a single QR code to a canvas and return it as a data URL
  const renderQRToCanvas = (qr, pxSize) => {
    return new Promise((resolve) => {
      const code = generateQRCode(buildScanUrl(qr.short_id, qr.products?.gtin))
      if (!code) { resolve(null); return }
      const matrix = code.modules
      const gridSize = matrix.length
      const modSize = pxSize / gridSize

      const ctaText = qr.cta_text || ''
      const bannerHeight = ctaText ? pxSize * 0.12 : 0
      const totalHeight = pxSize + bannerHeight

      const canvas = document.createElement('canvas')
      canvas.width = pxSize
      canvas.height = totalHeight
      const ctx = canvas.getContext('2d')

      ctx.fillStyle = qr.bg_color || '#FFFFFF'
      ctx.fillRect(0, 0, pxSize, totalHeight)

      ctx.fillStyle = qr.fg_color || '#18181B'
      for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
          if (!matrix[y][x]) continue
          ctx.fillRect(x * modSize, y * modSize, modSize, modSize)
        }
      }

      if (ctaText) {
        ctx.fillStyle = qr.fg_color || '#18181B'
        ctx.fillRect(0, pxSize, pxSize, bannerHeight)
        ctx.fillStyle = qr.bg_color || '#FFFFFF'
        ctx.font = `bold ${bannerHeight * 0.5}px Inter, -apple-system, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(ctaText.toUpperCase(), pxSize / 2, pxSize + bannerHeight / 2)
      }

      const finalize = () => resolve(canvas.toDataURL('image/png'))

      if (qr.logo_url) {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          const logoScale = qr.logo_scale || 0.25
          const logoSz = pxSize * logoScale
          const logoPos = (pxSize - logoSz) / 2
          const pad = logoSz * 0.12
          ctx.fillStyle = qr.bg_color || '#FFFFFF'
          roundRect(ctx, logoPos - pad, logoPos - pad, logoSz + pad * 2, logoSz + pad * 2, 12)
          ctx.fill()
          ctx.drawImage(img, logoPos, logoPos, logoSz, logoSz)
          finalize()
        }
        img.onerror = finalize
        img.src = qr.logo_url
      } else {
        finalize()
      }
    })
  }

  const generateSheet = async () => {
    if (!downloadModal) return
    setGenerating(true)
    const { qr, format } = downloadModal
    const sizeInches = parseFloat(sheetSize)
    const qty = parseInt(sheetQty) || 1
    const productName = qr.products?.name || qr.short_id

    if (format === 'single-png') {
      downloadPNG(qr.short_id, productName, qr)
      setDownloadModal(null)
      setGenerating(false)
      return
    }
    if (format === 'single-svg') {
      downloadSVG(qr.short_id, productName, qr)
      setDownloadModal(null)
      setGenerating(false)
      return
    }

    // Generate PDF sticker sheet
    const pageW = 8.5
    const pageH = 11
    const margin = 0.25
    const gap = 0.15
    const usableW = pageW - margin * 2
    const usableH = pageH - margin * 2

    const ctaText = qr.cta_text || ''
    const aspectRatio = ctaText ? 1 + 0.12 : 1
    const cellH = sizeInches * aspectRatio

    const cols = Math.floor((usableW + gap) / (sizeInches + gap))
    const rows = Math.floor((usableH + gap) / (cellH + gap))
    const perPage = cols * rows
    const totalPages = Math.ceil(qty / perPage)

    // Render QR at high res
    const pxSize = Math.max(600, Math.round(sizeInches * 300))
    const qrDataUrl = await renderQRToCanvas(qr, pxSize)
    if (!qrDataUrl) { setGenerating(false); return }

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'in', format: 'letter' })

    let placed = 0
    for (let page = 0; page < totalPages; page++) {
      if (page > 0) pdf.addPage()

      // Center the grid on the page
      const gridW = cols * sizeInches + (cols - 1) * gap
      const gridH = rows * cellH + (rows - 1) * gap
      const offsetX = (pageW - gridW) / 2
      const offsetY = (pageH - gridH) / 2

      for (let r = 0; r < rows && placed < qty; r++) {
        for (let c = 0; c < cols && placed < qty; c++) {
          const x = offsetX + c * (sizeInches + gap)
          const y = offsetY + r * (cellH + gap)
          pdf.addImage(qrDataUrl, 'PNG', x, y, sizeInches, cellH)

          // Light cut guide
          pdf.setDrawColor(200, 200, 200)
          pdf.setLineWidth(0.003)
          pdf.rect(x, y, sizeInches, cellH)

          placed++
        }
      }
    }

    pdf.save(`${productName}-qr-sheet-${sizeInches}in-x${qty}.pdf`)
    setDownloadModal(null)
    setGenerating(false)
  }

  // Preview logo: use new file preview, existing URL, or null
  const previewLogo = form.logoRawFile ? form.logoFile : (form.existingLogoUrl || null)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700 }}>QR Codes</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
            Branded QR codes with your logo in the center
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Create QR Code</button>
      </div>

      {/* Storefront Primary QR */}
      {brand?.business_type === 'storefront' && (
        <div className="card" style={{ marginBottom: 28, display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{
            background: '#0A0A10', borderRadius: 12, padding: 20,
            display: 'flex', justifyContent: 'center', flexShrink: 0,
          }}>
            <BrandedQR
              url={`${scanUrl}/store/${brand.id}`}
              fgColor={brand.accent_hex === '#FFFFFF' ? '#18181B' : (brand.accent_hex || '#18181B')}
              bgColor="#FFFFFF"
              logo={brand.logo_url || null}
              logoScale={0.25}
              size={140}
            />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 6 }}>
              Your Store QR Code
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 4 }}>{brand.name}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12, wordBreak: 'break-all' }}>
              {scanUrl}/store/{brand.id}
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.5 }}>
              This is your main QR code. Put it on your counter, table tents, window, or register. Customers scan it to see your menu, join loyalty, and enter promos.
            </p>
            <button className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '8px 16px' }}
              onClick={() => {
                const code = generateQRCode(`${scanUrl}/store/${brand.id}`)
                if (!code) return
                const matrix = code.modules
                const gridSize = matrix.length
                const hiResSize = 1000
                const modSize = hiResSize / gridSize
                const hiRes = document.createElement('canvas')
                hiRes.width = hiResSize
                hiRes.height = hiResSize
                const ctx = hiRes.getContext('2d')
                ctx.fillStyle = '#FFFFFF'
                ctx.fillRect(0, 0, hiResSize, hiResSize)
                ctx.fillStyle = brand.accent_hex === '#FFFFFF' ? '#18181B' : (brand.accent_hex || '#18181B')
                for (let y = 0; y < gridSize; y++) {
                  for (let x = 0; x < gridSize; x++) {
                    if (!matrix[y][x]) continue
                    ctx.fillRect(x * modSize, y * modSize, modSize, modSize)
                  }
                }
                const link = document.createElement('a')
                link.download = `${brand.name.replace(/\s+/g, '-')}-store-qr.png`
                link.href = hiRes.toDataURL('image/png')
                link.click()
              }}>
              Download PNG
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ color: 'var(--text-muted)', padding: 40, textAlign: 'center' }}>Loading...</div>
      ) : qrCodes.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 8 }}>No QR codes yet</div>
          <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
            {products.length === 0
              ? 'Add a product first, then create a QR code for it.'
              : 'Create your first QR code to start tracking scans.'}
          </p>
          <button className="btn btn-primary" onClick={openCreate}>+ Create QR Code</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
          {qrCodes.map(qr => (
            <div key={qr.id} className="card" style={{ textAlign: 'center' }}>
              <div style={{
                background: '#0A0A10', borderRadius: 12, padding: 28,
                display: 'flex', justifyContent: 'center', marginBottom: 16
              }}>
                <BrandedQR
                  url={buildScanUrl(qr.short_id, qr.products?.gtin)}
                  fgColor={qr.fg_color}
                  bgColor={qr.bg_color}
                  logoSrc={qr.logo_url || null}
                  logoScale={qr.logo_scale || 0.25}
                  size={200}
                  canvasId={`qr-${qr.short_id}`}
                  ctaText={qr.cta_text || ''}
                />
              </div>
              <h3 style={{ fontWeight: 600, marginBottom: 4 }}>{qr.products?.name || 'Product'}</h3>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 4 }}>
                {qr.products?.sku || ''}
              </div>
              {qr.channels?.name && (
                <div style={{ marginBottom: 4 }}>
                  <span style={{
                    display: 'inline-block', padding: '2px 8px', borderRadius: 6,
                    fontSize: '0.75rem', fontWeight: 500,
                    background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)',
                  }}>
                    {qr.channels.name}
                  </span>
                </div>
              )}
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 12 }}>
                {qr.scan_count} scan{qr.scan_count !== 1 ? 's' : ''} &middot; {qr.short_id}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button className="btn btn-primary" style={{ flex: 1, fontSize: '0.8rem', padding: '8px' }}
                  onClick={() => setDownloadModal({ qr, format: 'png' })}>
                  PNG
                </button>
                <button className="btn btn-primary" style={{ flex: 1, fontSize: '0.8rem', padding: '8px' }}
                  onClick={() => setDownloadModal({ qr, format: 'svg' })}>
                  SVG
                </button>
                <button className="btn btn-secondary" style={{ flex: 1, fontSize: '0.8rem', padding: '8px' }}
                  onClick={() => openEdit(qr)}>
                  Edit
                </button>
                <button style={{
                  background: 'none', border: 'none', color: 'var(--text-muted)',
                  fontSize: '0.75rem', cursor: 'pointer', padding: '8px',
                }}
                  onClick={() => handleDelete(qr)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
          padding: 24
        }} onClick={() => { setShowModal(false); setEditingQR(null) }}>
          <div className="card" style={{ width: 580, maxWidth: '95vw' }}
            onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 24 }}>
              {editingQR ? 'Edit QR Code' : 'Create QR Code'}
            </h2>

            {products.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20 }}>
                <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>You need to add a product first before creating a QR code.</p>
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Close</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                        Product
                      </label>
                      <select className="input" value={form.productId}
                        onChange={e => setForm({ ...form, productId: e.target.value })} required>
                        <option value="">Select a product</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name} {p.sku ? `(${p.sku})` : ''}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                        Retail Channel (optional)
                      </label>
                      <select className="input" value={form.channelId}
                        onChange={e => setForm({ ...form, channelId: e.target.value })}>
                        <option value="">No channel</option>
                        {channels.map(ch => (
                          <option key={ch.id} value={ch.id}>{ch.name} ({ch.type})</option>
                        ))}
                      </select>
                      <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                        <button type="button" onClick={() => setShowAddChannel(!showAddChannel)}
                          style={{
                            background: 'none', border: 'none', padding: 0,
                            color: 'var(--success)', fontSize: '0.8rem', cursor: 'pointer',
                          }}>
                          + Add Channel
                        </button>
                        {channels.length > 0 && (
                          <button type="button" onClick={() => setShowManageChannels(!showManageChannels)}
                            style={{
                              background: 'none', border: 'none', padding: 0,
                              color: 'var(--text-muted)', fontSize: '0.8rem', cursor: 'pointer',
                            }}>
                            {showManageChannels ? 'Done' : 'Remove Channel'}
                          </button>
                        )}
                      </div>
                      {showManageChannels && channels.length > 0 && (
                        <div style={{
                          marginTop: 6, border: '1px solid var(--border)', borderRadius: 8,
                          overflow: 'hidden',
                        }}>
                          {channels.map(ch => (
                            <div key={ch.id} style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: '6px 12px', borderBottom: '1px solid var(--border)',
                              fontSize: '0.8rem',
                            }}>
                              <span>{ch.name} ({ch.type})</span>
                              <button type="button" onClick={() => deleteChannel(ch.id, ch.name)}
                                style={{
                                  background: 'none', border: 'none', color: '#ef4444',
                                  fontSize: '0.85rem', cursor: 'pointer', padding: '2px 6px',
                                }}>✕</button>
                            </div>
                          ))}
                        </div>
                      )}
                      {showAddChannel && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                          <input className="input" placeholder="Channel name" style={{ flex: 1 }}
                            value={newChannelName} onChange={e => setNewChannelName(e.target.value)} />
                          <select className="input" style={{ width: 110 }}
                            value={newChannelType} onChange={e => setNewChannelType(e.target.value)}>
                            <option value="retail">Retail</option>
                            <option value="dtc">DTC</option>
                            <option value="distributor">Distributor</option>
                            <option value="event">Event</option>
                          </select>
                          <button type="button" className="btn btn-primary" style={{ padding: '8px 14px', fontSize: '0.8rem' }}
                            onClick={addChannel}>Add</button>
                        </div>
                      )}
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                        Center Logo
                      </label>
                      {previewLogo ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <img src={previewLogo} alt="Logo"
                            style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 4, background: '#fff', padding: 2 }} />
                          <button type="button" onClick={removeLogo}
                            style={{ fontSize: '0.75rem', color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}>
                            Remove
                          </button>
                        </div>
                      ) : null}
                      <input type="file" accept="image/*" onChange={handleLogoUpload}
                        style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }} />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                        QR Color
                      </label>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input type="color" value={form.fgColor}
                          onChange={e => setForm({ ...form, fgColor: e.target.value })}
                          style={{ width: 40, height: 40, border: 'none', borderRadius: 8, cursor: 'pointer' }} />
                        <input className="input" value={form.fgColor}
                          onChange={e => setForm({ ...form, fgColor: e.target.value })} />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                        Call to Action Text
                      </label>
                      <input className="input" placeholder="e.g. Members Only, Scan for Deals"
                        value={form.ctaText} onChange={e => setForm({ ...form, ctaText: e.target.value })} />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                        Background Color
                      </label>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input type="color" value={form.bgColor}
                          onChange={e => setForm({ ...form, bgColor: e.target.value })}
                          style={{ width: 40, height: 40, border: 'none', borderRadius: 8, cursor: 'pointer' }} />
                        <input className="input" value={form.bgColor}
                          onChange={e => setForm({ ...form, bgColor: e.target.value })} />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                      Live Preview
                    </label>
                    <div style={{
                      background: '#0A0A10', borderRadius: 16, padding: 24,
                      display: 'flex', justifyContent: 'center', alignItems: 'center',
                      border: '1px solid var(--border)', minHeight: 280,
                    }}>
                      <BrandedQR
                        url={editingQR ? buildScanUrl(editingQR.short_id, editingQR.products?.gtin) : `${scanUrl}/s/preview`}
                        fgColor={form.fgColor}
                        bgColor={form.bgColor}
                        logoSrc={previewLogo}
                        logoScale={form.logoScale}
                        size={240}
                        ctaText={form.ctaText}
                      />
                    </div>
                    <p style={{
                      color: 'var(--text-muted)', fontSize: '0.75rem',
                      textAlign: 'center', marginTop: 10, lineHeight: 1.4
                    }}>
                      Scan with your phone to verify it works.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                  <button type="button" className="btn btn-secondary" style={{ flex: 1 }}
                    onClick={() => { setShowModal(false); setEditingQR(null) }}>Cancel</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
                    {saving ? 'Saving...' : editingQR ? 'Save Changes' : 'Create QR Code'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Download / Print Sheet Modal */}
      {downloadModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60,
          padding: 24,
        }} onClick={() => !generating && setDownloadModal(null)}>
          <div className="card" style={{ width: 440, maxWidth: '95vw' }}
            onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 6 }}>
              Download QR Code
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 20 }}>
              {downloadModal.qr.products?.name || 'QR Code'}
            </p>

            {/* Single download */}
            <div style={{
              display: 'flex', gap: 10, marginBottom: 20, paddingBottom: 20,
              borderBottom: '1px solid var(--border)',
            }}>
              <button className="btn btn-secondary" style={{ flex: 1, fontSize: '0.85rem' }}
                onClick={() => { downloadPNG(downloadModal.qr.short_id, downloadModal.qr.products?.name, downloadModal.qr); setDownloadModal(null) }}>
                Download Single PNG
              </button>
              <button className="btn btn-secondary" style={{ flex: 1, fontSize: '0.85rem' }}
                onClick={() => { downloadSVG(downloadModal.qr.short_id, downloadModal.qr.products?.name, downloadModal.qr); setDownloadModal(null) }}>
                Download Single SVG
              </button>
            </div>

            {/* Print sheet */}
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 14 }}>
              Print Sheet (PDF)
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 14 }}>
              Generate a printable PDF with your QR codes laid out on 8.5 x 11" paper. Just print and cut.
            </p>

            <div style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                  QR Code Size
                </label>
                <select className="input" value={sheetSize} onChange={e => setSheetSize(e.target.value)}>
                  <option value="0.75">0.75" (small sticker)</option>
                  <option value="1">1" (standard sticker)</option>
                  <option value="1.5">1.5" (medium)</option>
                  <option value="2">2" (large sticker)</option>
                  <option value="3">3" (shelf tag)</option>
                  <option value="4">4" (display)</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                  Quantity
                </label>
                <input className="input" type="number" min="1" max="500" value={sheetQty}
                  onChange={e => setSheetQty(e.target.value)} />
              </div>
            </div>

            {(() => {
              const sizeIn = parseFloat(sheetSize)
              const ctaText = downloadModal.qr.cta_text || ''
              const aspect = ctaText ? 1 + 0.12 : 1
              const cellH = sizeIn * aspect
              const cols = Math.floor((8 + 0.15) / (sizeIn + 0.15))
              const rows = Math.floor((10.5 + 0.15) / (cellH + 0.15))
              const perPage = cols * rows
              const pages = Math.ceil((parseInt(sheetQty) || 1) / perPage)
              return (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 16 }}>
                  {perPage} per page &middot; {pages} page{pages !== 1 ? 's' : ''} &middot; {cols} columns x {rows} rows
                </p>
              )
            })()}

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }}
                onClick={() => setDownloadModal(null)} disabled={generating}>
                Cancel
              </button>
              <button className="btn btn-primary" style={{ flex: 1 }}
                onClick={generateSheet} disabled={generating}>
                {generating ? 'Generating...' : 'Generate Print Sheet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
