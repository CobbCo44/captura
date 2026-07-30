import { useState, useEffect } from 'react'
import { supabase, generateShortId } from '../../lib/supabase'
import BrandedQR from '../../components/BrandedQR'
import generateQRCode from 'qr.js'
import { buildGS1DigitalLink } from '../../lib/gs1'
import { exportBatchCSV } from '../../lib/exportBatchCSV'
import { jsPDF } from 'jspdf'
import JSZip from 'jszip'

const SCAN_DOMAIN = 'https://www.meetcaptura.com'

function roundRectPath(ctx, x, y, w, h, r) {
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

function renderSerialQRToCanvas(url, fgColor, bgColor, logoDataUrl, logoScale, ctaText, size = 1000) {
  return new Promise((resolve) => {
    const code = generateQRCode(url)
    if (!code) { resolve(null); return }
    const matrix = code.modules
    const gridSize = matrix.length
    const modSize = size / gridSize
    const bannerHeight = ctaText ? size * 0.12 : 0
    const totalHeight = size + bannerHeight
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = totalHeight
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, size, totalHeight)
    ctx.fillStyle = fgColor
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        if (!matrix[y][x]) continue
        ctx.fillRect(x * modSize, y * modSize, modSize, modSize)
      }
    }
    if (ctaText) {
      ctx.fillStyle = fgColor
      ctx.fillRect(0, size, size, bannerHeight)
      ctx.fillStyle = bgColor
      ctx.font = `bold ${bannerHeight * 0.5}px Inter, -apple-system, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(ctaText.toUpperCase(), size / 2, size + bannerHeight / 2)
    }
    if (logoDataUrl) {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const logoSize = size * logoScale
        const logoPos = (size - logoSize) / 2
        const padding = logoSize * 0.12
        ctx.fillStyle = bgColor
        roundRectPath(ctx, logoPos - padding, logoPos - padding,
          logoSize + padding * 2, logoSize + padding * 2, 12)
        ctx.fill()
        ctx.drawImage(img, logoPos, logoPos, logoSize, logoSize)
        resolve(canvas)
      }
      img.onerror = () => resolve(canvas)
      img.src = logoDataUrl
    } else {
      resolve(canvas)
    }
  })
}

async function fetchAllSerials(batchId) {
  if (!supabase) return []
  const allSerials = []
  const pageSize = 1000
  let from = 0
  while (true) {
    const { data, error } = await supabase
      .from('serials')
      .select('serial, created_at')
      .eq('batch_id', batchId)
      .order('created_at', { ascending: true })
      .range(from, from + pageSize - 1)
    if (error) { alert('Error loading serials.'); return [] }
    allSerials.push(...data)
    if (data.length < pageSize) break
    from += pageSize
  }
  return allSerials
}

function csvEscape(value) {
  const str = String(value ?? '')
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

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

  // Serialized batch state
  const [batches, setBatches] = useState([])
  const [batchesLoading, setBatchesLoading] = useState(false)
  const [batchGenerating, setBatchGenerating] = useState(false)
  const [showBatchForm, setShowBatchForm] = useState(false)
  const [batchForm, setBatchForm] = useState({ productId: '', quantity: '', channelId: '', newChannelName: '', newChannelType: 'retail', poReference: '', notes: '' })
  const [claimedCounts, setClaimedCounts] = useState({})
  const [batchQrModal, setBatchQrModal] = useState(null)
  const [batchQrStyle, setBatchQrStyle] = useState({ fgColor: '#18181B', bgColor: '#FFFFFF', logoFile: null, logoScale: 0.25, ctaText: '' })
  const [batchDownloadProgress, setBatchDownloadProgress] = useState(null)

  // Storefront QR customization
  const [storeQR, setStoreQR] = useState({
    fgColor: '#18181B', bgColor: '#FFFFFF', logoFile: null, logoUrl: null, logoScale: 0.25, ctaText: '',
  })
  const [editingStoreQR, setEditingStoreQR] = useState(false)
  const [savingStoreQR, setSavingStoreQR] = useState(false)

  // Load saved store QR settings from brand row
  useEffect(() => {
    if (brand) {
      setStoreQR(prev => ({
        ...prev,
        fgColor: brand.store_qr_fg_color || '#18181B',
        bgColor: brand.store_qr_bg_color || '#FFFFFF',
        logoUrl: brand.store_qr_logo_url || null,
        logoScale: brand.store_qr_logo_scale || 0.25,
        ctaText: brand.store_qr_cta_text || '',
      }))
    }
  }, [brand])

  async function saveStoreQR() {
    if (!supabase || !brand?.id || brand.id === 'demo') return
    setSavingStoreQR(true)

    // Upload logo if a new file was selected (logoFile is a data URL from FileReader)
    let logoUrl = storeQR.logoUrl
    if (storeQR.logoFile && storeQR.logoFile.startsWith('data:')) {
      // Convert data URL to blob for upload
      const res = await fetch(storeQR.logoFile)
      const blob = await res.blob()
      const ext = blob.type.split('/')[1] || 'png'
      const fileName = `${brand.id}/store-qr-logo-${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('product-images').upload(fileName, blob)
      if (!error) {
        const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(fileName)
        logoUrl = urlData.publicUrl
      }
    }

    const { error } = await supabase.from('brands').update({
      store_qr_fg_color: storeQR.fgColor,
      store_qr_bg_color: storeQR.bgColor,
      store_qr_logo_url: logoUrl,
      store_qr_logo_scale: storeQR.logoScale,
      store_qr_cta_text: storeQR.ctaText || null,
    }).eq('id', brand.id)

    if (error) {
      alert('Error saving store QR settings: ' + error.message)
    } else {
      // Update local state with the persisted logo URL
      setStoreQR(prev => ({ ...prev, logoUrl: logoUrl, logoFile: null }))
    }
    setSavingStoreQR(false)
  }

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
    loadBatches()
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

  const downloadPNG = (shortId, productName, qr, overrideUrl) => {
    const code = generateQRCode(overrideUrl || buildScanUrl(shortId, qr.products?.gtin))
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

  // ========== SERIALIZED BATCH HELPERS ==========

  async function loadBatches() {
    if (!supabase || !brand?.id || brand.id === 'demo') return
    setBatchesLoading(true)
    const { data } = await supabase
      .from('batches')
      .select('*, channels:channel_id(name), products:product_id(name, gtin)')
      .eq('brand_id', brand.id)
      .order('created_at', { ascending: false })
    setBatches(data || [])

    if (data && data.length > 0) {
      const batchIds = data.map(b => b.id)
      const { data: serials } = await supabase
        .from('serials')
        .select('batch_id, status')
        .in('batch_id', batchIds)
      if (serials) {
        const counts = {}
        serials.forEach(s => {
          if (!counts[s.batch_id]) counts[s.batch_id] = { total: 0, claimed: 0 }
          counts[s.batch_id].total++
          if (s.status === 'claimed') counts[s.batch_id].claimed++
        })
        setClaimedCounts(counts)
      }
    }
    setBatchesLoading(false)
  }

  async function deleteBatch(batchId) {
    if (!supabase) return
    if (!window.confirm('Delete this batch and all its serial codes? This cannot be undone.')) return
    const { error } = await supabase.rpc('delete_batch', { p_batch_id: batchId })
    if (error) {
      alert('Failed to delete batch: ' + error.message)
      return
    }
    loadBatches()
  }

  async function handleGenerateBatch() {
    if (!supabase || !brand?.id || brand.id === 'demo') return
    const qty = parseInt(batchForm.quantity, 10)
    if (!qty || qty < 1 || qty > 10000) {
      alert('Quantity must be between 1 and 10,000.')
      return
    }
    if (!batchForm.productId) {
      alert('Please select a product.')
      return
    }

    let channelId = batchForm.channelId
    if (channelId === '__new__') {
      if (!batchForm.newChannelName.trim()) {
        alert('Please enter a channel name.')
        return
      }
      const { data: newChannel, error: chErr } = await supabase
        .from('channels')
        .insert({ brand_id: brand.id, name: batchForm.newChannelName.trim(), type: batchForm.newChannelType })
        .select()
        .single()
      if (chErr) {
        alert(`Error creating channel: ${chErr.message}`)
        return
      }
      channelId = newChannel.id
      setChannels(prev => [...prev, newChannel].sort((a, b) => a.name.localeCompare(b.name)))
    }

    if (!channelId) {
      alert('Please select a channel.')
      return
    }

    setBatchGenerating(true)
    const { error } = await supabase.rpc('generate_batch', {
      p_product_id: batchForm.productId,
      p_channel_id: channelId,
      p_quantity: qty,
      p_po_reference: batchForm.poReference || null,
      p_notes: batchForm.notes || null,
    })
    if (error) {
      alert(`Error generating batch: ${error.message}`)
    } else {
      setBatchForm({ productId: '', quantity: '', channelId: '', newChannelName: '', newChannelType: 'retail', poReference: '', notes: '' })
      setShowBatchForm(false)
      loadBatches()
    }
    setBatchGenerating(false)
  }

  function openBatchQrModal(batch) {
    // Find the QR card that matches this batch's product and channel to inherit its style
    const matchingQr = qrCodes.find(qr =>
      qr.product_id === batch.product_id &&
      ((!qr.channel_id && !batch.channel_id) || qr.channel_id === batch.channel_id)
    ) || qrCodes.find(qr => qr.product_id === batch.product_id)
    if (matchingQr) {
      setBatchQrStyle({
        fgColor: matchingQr.fg_color || '#18181B',
        bgColor: matchingQr.bg_color || '#FFFFFF',
        logoFile: matchingQr.logo_url || null,
        logoScale: matchingQr.logo_scale || 0.25,
        ctaText: matchingQr.cta_text || '',
      })
    } else {
      setBatchQrStyle({ fgColor: '#18181B', bgColor: '#FFFFFF', logoFile: null, logoScale: 0.25, ctaText: '' })
    }
    setBatchDownloadProgress(null)
    setBatchQrModal(batch)
  }

  async function handleBatchDownloadZip() {
    if (!batchQrModal) return
    const gtin = batchQrModal.products?.gtin
    if (!gtin) return

    setBatchDownloadProgress({ current: 0, total: 0, type: 'zip' })
    const serials = await fetchAllSerials(batchQrModal.id)
    if (!serials.length) { setBatchDownloadProgress(null); return }

    setBatchDownloadProgress({ current: 0, total: serials.length, type: 'zip' })
    const zip = new JSZip()
    const imgFolder = zip.folder('qr-codes')

    for (let i = 0; i < serials.length; i++) {
      const s = serials[i]
      const url = buildGS1DigitalLink(SCAN_DOMAIN, gtin, { serial: s.serial })
      const canvas = await renderSerialQRToCanvas(
        url, batchQrStyle.fgColor, batchQrStyle.bgColor,
        batchQrStyle.logoFile, batchQrStyle.logoScale, batchQrStyle.ctaText
      )
      if (canvas) {
        const dataUrl = canvas.toDataURL('image/png')
        const base64 = dataUrl.split(',')[1]
        imgFolder.file(`${s.serial}.png`, base64, { base64: true })
      }
      setBatchDownloadProgress({ current: i + 1, total: serials.length, type: 'zip' })
    }

    const productName = batchQrModal.products?.name || ''
    const channelName = batchQrModal.channels?.name || ''
    const poRef = batchQrModal.po_reference || ''
    const csvHeader = 'serial,url,product_name,gtin,batch_id,channel_name,po_reference,created_at'
    const csvRows = serials.map(s => {
      const g14 = gtin.replace(/\D/g, '').padStart(14, '0')
      const url = `${SCAN_DOMAIN}/01/${g14}/21/${encodeURIComponent(s.serial)}`
      return [csvEscape(s.serial), csvEscape(url), csvEscape(productName), csvEscape(gtin),
        csvEscape(batchQrModal.id), csvEscape(channelName), csvEscape(poRef), csvEscape(s.created_at)].join(',')
    })
    zip.file('serials.csv', [csvHeader, ...csvRows].join('\n'))

    const blob = await zip.generateAsync({ type: 'blob' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `batch-${batchQrModal.id.slice(0, 8)}-${serials.length}-qr-codes.zip`
    link.click()
    URL.revokeObjectURL(link.href)
    setBatchDownloadProgress(null)
  }

  async function handleBatchDownloadPdf() {
    if (!batchQrModal) return
    const gtin = batchQrModal.products?.gtin
    if (!gtin) return

    setBatchDownloadProgress({ current: 0, total: 0, type: 'pdf' })
    const serials = await fetchAllSerials(batchQrModal.id)
    if (!serials.length) { setBatchDownloadProgress(null); return }

    setBatchDownloadProgress({ current: 0, total: serials.length, type: 'pdf' })
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'in', format: 'letter' })
    const pageW = 8.5, pageH = 11
    const cols = 4, rows = 5
    const perPage = cols * rows
    const marginX = 0.5, marginY = 0.5
    const cellW = (pageW - marginX * 2) / cols
    const cellH = (pageH - marginY * 2) / rows
    const qrSize = Math.min(cellW, cellH) * 0.72

    for (let i = 0; i < serials.length; i++) {
      const pageIndex = Math.floor(i / perPage)
      const posOnPage = i % perPage
      if (posOnPage === 0 && pageIndex > 0) pdf.addPage()

      const col = posOnPage % cols
      const row = Math.floor(posOnPage / cols)
      const cx = marginX + col * cellW + cellW / 2
      const cy = marginY + row * cellH

      const s = serials[i]
      const url = buildGS1DigitalLink(SCAN_DOMAIN, gtin, { serial: s.serial })
      const canvas = await renderSerialQRToCanvas(
        url, batchQrStyle.fgColor, batchQrStyle.bgColor,
        batchQrStyle.logoFile, batchQrStyle.logoScale, batchQrStyle.ctaText, 400
      )

      if (canvas) {
        const dataUrl = canvas.toDataURL('image/png')
        const imgX = cx - qrSize / 2
        const imgY = cy + 0.08
        const aspectRatio = canvas.height / canvas.width
        const imgH = qrSize * aspectRatio
        pdf.addImage(dataUrl, 'PNG', imgX, imgY, qrSize, imgH)
        pdf.setFontSize(6)
        pdf.setTextColor(100)
        pdf.text(s.serial, cx, imgY + imgH + 0.12, { align: 'center' })
      }

      setBatchDownloadProgress({ current: i + 1, total: serials.length, type: 'pdf' })
    }

    pdf.save(`batch-${batchQrModal.id.slice(0, 8)}-${serials.length}-qr-codes.pdf`)
    setBatchDownloadProgress(null)
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
        <div className="card" style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{
              background: '#0A0A10', borderRadius: 12, padding: 20,
              display: 'flex', justifyContent: 'center', flexShrink: 0,
            }}>
              <BrandedQR
                url={`${scanUrl}/store/${brand.id}`}
                fgColor={storeQR.fgColor}
                bgColor={storeQR.bgColor}
                logoSrc={storeQR.logoFile || storeQR.logoUrl || brand.logo_url || null}
                logoScale={storeQR.logoScale}
                size={160}
                ctaText={storeQR.ctaText}
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

              {!editingStoreQR ? (
                <>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.5 }}>
                    This is your main QR code. Put it on your counter, table tents, window, or register.
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '8px 16px' }}
                      onClick={() => downloadPNG(`store-${brand.id}`, brand.name, {
                        fg_color: storeQR.fgColor, bg_color: storeQR.bgColor,
                        logo_url: storeQR.logoFile || storeQR.logoUrl || brand.logo_url,
                        logo_scale: storeQR.logoScale, cta_text: storeQR.ctaText,
                        products: null,
                      }, `${scanUrl}/store/${brand.id}`)}>
                      Download PNG
                    </button>
                    <button className="btn btn-secondary" style={{ fontSize: '0.85rem', padding: '8px 16px' }}
                      onClick={() => setEditingStoreQR(true)}>
                      Customize
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Colors */}
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>QR Color</label>
                      <input type="color" value={storeQR.fgColor}
                        onChange={e => setStoreQR({ ...storeQR, fgColor: e.target.value })}
                        style={{ width: 40, height: 40, border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', background: 'transparent' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Background</label>
                      <input type="color" value={storeQR.bgColor}
                        onChange={e => setStoreQR({ ...storeQR, bgColor: e.target.value })}
                        style={{ width: 40, height: 40, border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', background: 'transparent' }} />
                    </div>
                  </div>

                  {/* Logo */}
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Center Logo</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <label className="btn btn-secondary" style={{ cursor: 'pointer', fontSize: '0.8rem', padding: '6px 12px' }}>
                        Upload
                        <input type="file" accept="image/*" style={{ display: 'none' }}
                          onChange={e => {
                            const file = e.target.files[0]
                            if (!file) return
                            const reader = new FileReader()
                            reader.onload = ev => setStoreQR({ ...storeQR, logoFile: ev.target.result })
                            reader.readAsDataURL(file)
                          }} />
                      </label>
                      {(storeQR.logoFile || storeQR.logoUrl || brand.logo_url) && (
                        <button type="button" onClick={() => setStoreQR({ ...storeQR, logoFile: null, logoUrl: null })}
                          style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '0.75rem', cursor: 'pointer' }}>
                          Remove
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Logo Scale */}
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Logo Size</label>
                    <input type="range" min={0.1} max={0.4} step={0.05} value={storeQR.logoScale}
                      onChange={e => setStoreQR({ ...storeQR, logoScale: parseFloat(e.target.value) })}
                      style={{ width: '100%', accentColor: '#FAFAFA' }} />
                  </div>

                  {/* CTA Text */}
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>CTA Text (optional)</label>
                    <input className="input" placeholder="e.g. Scan for Menu" value={storeQR.ctaText}
                      onChange={e => setStoreQR({ ...storeQR, ctaText: e.target.value })}
                      style={{ fontSize: '0.85rem', padding: '8px 12px' }} />
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '8px 16px' }}
                      disabled={savingStoreQR}
                      onClick={async () => {
                        await saveStoreQR()
                        setEditingStoreQR(false)
                        downloadPNG(`store-${brand.id}`, brand.name, {
                          fg_color: storeQR.fgColor, bg_color: storeQR.bgColor,
                          logo_url: storeQR.logoFile || storeQR.logoUrl || brand.logo_url,
                          logo_scale: storeQR.logoScale, cta_text: storeQR.ctaText,
                          products: null,
                        }, `${scanUrl}/store/${brand.id}`)
                      }}>
                      {savingStoreQR ? 'Saving...' : 'Download PNG'}
                    </button>
                    <button className="btn btn-secondary" style={{ fontSize: '0.85rem', padding: '8px 16px' }}
                      disabled={savingStoreQR}
                      onClick={async () => {
                        await saveStoreQR()
                        setEditingStoreQR(false)
                      }}>
                      {savingStoreQR ? 'Saving...' : 'Done'}
                    </button>
                  </div>
                </div>
              )}
            </div>
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
              ? (brand?.business_type === 'storefront'
                ? 'Add a product on the Products page, then create a QR code for it.'
                : 'Add a product first, then create a QR code for it.')
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
              {qr.products?.gtin && (
                <button className="btn btn-secondary" style={{ width: '100%', fontSize: '0.8rem', padding: '8px', marginTop: 6 }}
                  onClick={() => {
                    setBatchForm({ productId: qr.product_id, quantity: '', channelId: qr.channel_id || '', newChannelName: '', newChannelType: 'retail', poReference: '', notes: '' })
                    setBatchQrStyle({ fgColor: qr.fg_color || '#18181B', bgColor: qr.bg_color || '#FFFFFF', logoFile: qr.logo_url || null, logoScale: qr.logo_scale || 0.25, ctaText: qr.cta_text || '' })
                    setShowBatchForm(qr)
                  }}>
                  Generate Batch
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ========== SERIALIZED BATCHES SECTION ========== */}
      {/* Batch Generation Modal */}
      {showBatchForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
          padding: 24,
        }} onClick={() => setShowBatchForm(false)}>
          <div className="card" style={{ width: 520, maxWidth: '95vw' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>Generate Serialized Batch</h2>
              <button onClick={() => setShowBatchForm(false)} style={{
                background: 'none', border: 'none', color: 'var(--text-muted)',
                fontSize: '1.2rem', cursor: 'pointer',
              }}>x</button>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 20 }}>
              Generate unique QR codes for <strong>{showBatchForm?.products?.name || 'this product'}</strong>. Each code uses this QR's design and is trackable back to the unit, channel, and consumer who scanned it.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                  Quantity (1 - 10,000)
                </label>
                <input className="input" type="number" min="1" max="10000"
                  placeholder="e.g. 500"
                  value={batchForm.quantity}
                  onChange={e => setBatchForm({ ...batchForm, quantity: e.target.value })} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>Channel</label>
                <div style={{
                  border: '1px solid var(--border)', borderRadius: 8,
                  maxHeight: 180, overflowY: 'auto', background: 'var(--card-bg)',
                }}>
                  {channels.map(ch => (
                    <div key={ch.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 12px', cursor: 'pointer',
                      borderBottom: '1px solid var(--border)',
                      background: batchForm.channelId === ch.id ? 'var(--bg)' : 'transparent',
                    }} onClick={() => setBatchForm({ ...batchForm, channelId: ch.id })}>
                      <span style={{
                        fontSize: '0.85rem',
                        fontWeight: batchForm.channelId === ch.id ? 600 : 400,
                        color: batchForm.channelId === ch.id ? 'var(--success)' : '#FAFAFA',
                      }}>
                        {batchForm.channelId === ch.id && '✓ '}{ch.name} ({ch.type})
                      </span>
                    </div>
                  ))}
                  <div style={{
                    padding: '8px 12px', cursor: 'pointer',
                    color: 'var(--success)', fontSize: '0.85rem',
                    background: batchForm.channelId === '__new__' ? 'var(--bg)' : 'transparent',
                  }} onClick={() => setBatchForm({ ...batchForm, channelId: '__new__' })}>
                    + Add new channel
                  </div>
                </div>
              </div>

              {batchForm.channelId === '__new__' && (
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>Channel Name</label>
                    <input className="input" placeholder="e.g. Amazon US"
                      value={batchForm.newChannelName}
                      onChange={e => setBatchForm({ ...batchForm, newChannelName: e.target.value })} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>Type</label>
                    <select className="input" value={batchForm.newChannelType}
                      onChange={e => setBatchForm({ ...batchForm, newChannelType: e.target.value })}>
                      <option value="retail">Retail</option>
                      <option value="dtc">DTC</option>
                      <option value="distributor">Distributor</option>
                      <option value="event">Event</option>
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>PO Reference (optional)</label>
                <input className="input" placeholder="e.g. PO-2026-1234"
                  value={batchForm.poReference}
                  onChange={e => setBatchForm({ ...batchForm, poReference: e.target.value })} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>Notes (optional)</label>
                <textarea className="input" placeholder="Internal notes about this batch"
                  value={batchForm.notes}
                  onChange={e => setBatchForm({ ...batchForm, notes: e.target.value })}
                  style={{ minHeight: 60, resize: 'vertical' }} />
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }}
                  onClick={() => setShowBatchForm(false)}>Cancel</button>
                <button type="button" className="btn btn-primary" style={{ flex: 1 }}
                  disabled={batchGenerating || !batchForm.productId}
                  onClick={() => handleGenerateBatch()}>
                  {batchGenerating ? 'Generating...' : 'Generate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Serialized Batches Table */}
      {!loading && batches.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 16 }}>Serialized Batches</h2>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Date', 'Product', 'Qty', 'Channel', 'PO Ref', 'Claimed', ''].map((h, idx) => (
                    <th key={idx} style={{
                      padding: '12px 16px', textAlign: 'left',
                      fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)',
                      textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {batches.map(b => {
                  const counts = claimedCounts[b.id] || { total: b.quantity, claimed: 0 }
                  return (
                    <tr key={b.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        {new Date(b.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 500 }}>
                        {b.products?.name || '-'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>{b.quantity}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                        {b.channels?.name || '-'}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                        {b.po_reference || '-'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          color: counts.claimed > 0 ? 'var(--success)' : 'var(--text-muted)',
                        }}>
                          {counts.claimed} / {counts.total}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button type="button" onClick={() => exportBatchCSV(b.id)}
                          style={{
                            background: 'none', border: 'none', color: '#FAFAFA',
                            fontSize: '0.8rem', cursor: 'pointer',
                          }}>
                          CSV
                        </button>
                        <button type="button" onClick={() => openBatchQrModal(b)}
                          style={{
                            background: 'none', border: 'none', color: 'var(--success)',
                            fontSize: '0.8rem', cursor: 'pointer',
                            marginLeft: 8,
                          }}>
                          Download
                        </button>
                        <button type="button" onClick={() => deleteBatch(b.id)}
                          style={{
                            background: 'none', border: 'none', color: '#ef4444',
                            fontSize: '0.8rem', cursor: 'pointer',
                            marginLeft: 8,
                          }}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Batch QR Style & Download Modal */}
      {batchQrModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20,
        }} onClick={() => { if (!batchDownloadProgress) setBatchQrModal(null) }}>
          <div style={{
            background: 'var(--card-bg)', borderRadius: 12, width: '100%', maxWidth: 640,
            maxHeight: '90vh', overflowY: 'auto',
            border: '1px solid var(--border)', padding: 24,
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Download QR Codes</h2>
              {!batchDownloadProgress && (
                <button onClick={() => setBatchQrModal(null)} style={{
                  background: 'none', border: 'none', color: 'var(--text-muted)',
                  fontSize: '1.2rem', cursor: 'pointer',
                }}>x</button>
              )}
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 20 }}>
              {batchQrModal.products?.name} &middot; {batchQrModal.quantity} codes &middot; {batchQrModal.channels?.name || 'Unknown channel'}{batchQrModal.po_reference ? ` &middot; PO: ${batchQrModal.po_reference}` : ''}
            </p>

            {batchDownloadProgress && (
              <div style={{ marginTop: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                  <span>Generating {batchDownloadProgress.type === 'zip' ? 'ZIP' : 'PDF'}...</span>
                  <span>{batchDownloadProgress.current} / {batchDownloadProgress.total}</span>
                </div>
                <div style={{
                  width: '100%', height: 6, borderRadius: 3,
                  background: 'var(--border)', overflow: 'hidden',
                }}>
                  <div style={{
                    width: batchDownloadProgress.total > 0
                      ? `${(batchDownloadProgress.current / batchDownloadProgress.total) * 100}%`
                      : '0%',
                    height: '100%', borderRadius: 3,
                    background: 'var(--success)', transition: 'width 0.15s',
                  }} />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }}
                disabled={!!batchDownloadProgress}
                onClick={() => setBatchQrModal(null)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" style={{ flex: 1 }}
                disabled={!!batchDownloadProgress}
                onClick={handleBatchDownloadZip}>
                {batchDownloadProgress?.type === 'zip' ? 'Generating...' : 'Download ZIP'}
              </button>
              <button type="button" className="btn btn-primary" style={{ flex: 1 }}
                disabled={!!batchDownloadProgress}
                onClick={handleBatchDownloadPdf}>
                {batchDownloadProgress?.type === 'pdf' ? 'Generating...' : 'Download PDF'}
              </button>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 12, lineHeight: 1.4 }}>
              ZIP: Individual PNG files per serial, ideal for packaging. PDF: Sticker sheet layout (4x5 grid), ideal for printing.
            </p>
          </div>
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
