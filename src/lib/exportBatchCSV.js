import { supabase } from './supabase'

const SCAN_DOMAIN = import.meta.env.VITE_SCAN_DOMAIN || 'https://www.meetcaptura.com'

export async function exportBatchCSV(batchId) {
  if (!supabase) return

  // Fetch batch with product and channel info
  const { data: batch, error: batchErr } = await supabase
    .from('batches')
    .select('*, products:product_id(name, gtin), channels:channel_id(name)')
    .eq('id', batchId)
    .single()

  if (batchErr || !batch) {
    alert('Could not load batch data.')
    return
  }

  // Fetch all serials for this batch
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

    if (error) {
      alert('Error loading serials.')
      return
    }
    allSerials.push(...data)
    if (data.length < pageSize) break
    from += pageSize
  }

  const productName = batch.products?.name || ''
  const gtin = batch.products?.gtin || ''

  // Without a GTIN, serial URLs go through the product's QR code (/s/:qrId/:serial).
  // Prefer the QR code on the batch's channel, like the batch download does.
  let qrShortId = null
  if (!gtin) {
    const { data: qrs } = await supabase
      .from('qr_codes')
      .select('short_id, channel_id')
      .eq('product_id', batch.product_id)
      .is('event_id', null)
    const match = (qrs || []).find(q => q.channel_id === batch.channel_id) || (qrs || [])[0]
    qrShortId = match?.short_id || null
    if (!qrShortId) {
      alert('This product has no GTIN, so its batch QR codes link through the product\'s QR code. Create a QR code for this product first.')
      return
    }
  }
  const channelName = batch.channels?.name || ''
  const poRef = batch.po_reference || ''

  // Build CSV
  const header = 'serial,url,product_name,gtin,batch_id,channel_name,po_reference,created_at'
  const rows = allSerials.map(s => {
    const url = gtin
      ? `${SCAN_DOMAIN}/01/${gtin.replace(/\D/g, '').padStart(14, '0')}/21/${encodeURIComponent(s.serial)}`
      : `${SCAN_DOMAIN}/s/${qrShortId}/${encodeURIComponent(s.serial)}`
    return [
      csvEscape(s.serial),
      csvEscape(url),
      csvEscape(productName),
      csvEscape(gtin),
      csvEscape(batchId),
      csvEscape(channelName),
      csvEscape(poRef),
      csvEscape(s.created_at),
    ].join(',')
  })

  const csv = [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `batch-${batchId.slice(0, 8)}-${allSerials.length}-serials.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}

function csvEscape(value) {
  const str = String(value ?? '')
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}
