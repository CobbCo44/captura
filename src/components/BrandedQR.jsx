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
  fgColor = '#6C2BD9',
  bgColor = '#FFFFFF',
  size = 300,
  logoSrc = null,
  logoScale = 0.25,
}) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const code = generateQR(url)
    const matrix = code.modules
    const gridSize = matrix.length
    const modSize = size / gridSize

    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')

    // Background
    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, size, size)

    // Draw all QR modules
    ctx.fillStyle = fgColor
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        if (!matrix[y][x]) continue
        ctx.fillRect(x * modSize, y * modSize, modSize, modSize)
      }
    }

    // Draw center logo
    if (logoSrc) {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const logoSize = size * logoScale
        const logoPos = (size - logoSize) / 2
        const padding = logoSize * 0.12

        // White background behind logo
        ctx.fillStyle = bgColor
        roundRect(ctx, logoPos - padding, logoPos - padding,
          logoSize + padding * 2, logoSize + padding * 2, 8)
        ctx.fill()

        // Draw logo
        ctx.drawImage(img, logoPos, logoPos, logoSize, logoSize)
      }
      img.src = logoSrc
    }
  }, [url, fgColor, bgColor, size, logoSrc, logoScale])

  return <canvas ref={canvasRef} style={{ width: size, height: size }} />
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
