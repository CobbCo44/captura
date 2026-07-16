import { useState, useEffect, useRef } from 'react'
import generateQR from 'qr.js'

const FINDER_SIZE = 7

function isFinderPattern(x, y, gridSize) {
  if (x < FINDER_SIZE + 1 && y < FINDER_SIZE + 1) return true
  if (x >= gridSize - FINDER_SIZE - 1 && y < FINDER_SIZE + 1) return true
  if (x < FINDER_SIZE + 1 && y >= gridSize - FINDER_SIZE - 1) return true
  return false
}

export default function BrandedQR({
  url = 'https://captura44.netlify.app',
  fgColor = '#18181B',
  bgColor = '#FFFFFF',
  size = 300,
  logoSrc = null,
  logoScale = 0.25,
  canvasId = null,
  ctaText = '',
}) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const code = generateQR(url)
    const matrix = code.modules
    const gridSize = matrix.length

    const bannerHeight = ctaText ? size * 0.12 : 0
    const totalHeight = size + bannerHeight
    const modSize = size / gridSize

    canvas.width = size
    canvas.height = totalHeight
    const ctx = canvas.getContext('2d')

    // Background
    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, size, totalHeight)

    // Draw all QR modules
    ctx.fillStyle = fgColor
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        if (!matrix[y][x]) continue
        ctx.fillRect(x * modSize, y * modSize, modSize, modSize)
      }
    }

    // Draw CTA banner below QR code
    if (ctaText) {
      ctx.fillStyle = fgColor
      ctx.fillRect(0, size, size, bannerHeight)

      ctx.fillStyle = bgColor
      ctx.font = `bold ${bannerHeight * 0.5}px Inter, -apple-system, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(ctaText.toUpperCase(), size / 2, size + bannerHeight / 2)
    }

    // Draw center logo (after banner so it layers correctly)
    if (logoSrc) {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const maxLogoSize = size * logoScale
        const aspect = img.naturalWidth / img.naturalHeight
        const logoW = aspect >= 1 ? maxLogoSize : maxLogoSize * aspect
        const logoH = aspect >= 1 ? maxLogoSize / aspect : maxLogoSize
        const logoX = (size - logoW) / 2
        const logoY = (size - logoH) / 2
        const padding = maxLogoSize * 0.12

        ctx.fillStyle = bgColor
        roundRect(ctx, logoX - padding, logoY - padding,
          logoW + padding * 2, logoH + padding * 2, 8)
        ctx.fill()

        ctx.drawImage(img, logoX, logoY, logoW, logoH)
      }
      img.src = logoSrc
    }
  }, [url, fgColor, bgColor, size, logoSrc, logoScale, ctaText])

  const bannerHeight = ctaText ? size * 0.12 : 0
  return <canvas ref={canvasRef} id={canvasId} style={{ width: size, height: size + bannerHeight }} />
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
