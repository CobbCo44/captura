import { useState, useEffect, useRef, useCallback } from 'react'
import { QR } from '@qrgrid/core'

const DEFAULT_MODULE_SIZE = 8
const FINDER_SIZE = 7

// Check if a module is part of a finder pattern (the 3 big corner squares)
function isFinderPattern(x, y, gridSize) {
  // Top-left
  if (x < FINDER_SIZE + 1 && y < FINDER_SIZE + 1) return true
  // Top-right
  if (x >= gridSize - FINDER_SIZE - 1 && y < FINDER_SIZE + 1) return true
  // Bottom-left
  if (x < FINDER_SIZE + 1 && y >= gridSize - FINDER_SIZE - 1) return true
  return false
}

// Check if module is part of the inner finder dot (3x3 center of finder)
function isFinderCenter(x, y, gridSize) {
  const centers = [
    [3, 3],
    [gridSize - 4, 3],
    [3, gridSize - 4],
  ]
  return centers.some(([cx, cy]) =>
    Math.abs(x - cx) <= 1 && Math.abs(y - cy) <= 1
  )
}

export default function BrandedQR({
  url = 'https://captura44.netlify.app',
  iconSrc = null,        // URL or data URL of the brand icon image
  iconSvgPath = null,    // SVG path data for the brand icon
  iconViewBox = '0 0 24 24',
  fgColor = '#6C2BD9',
  bgColor = 'transparent',
  finderColor = null,    // defaults to fgColor
  moduleSize = DEFAULT_MODULE_SIZE,
  size = 300,
  showLogo = false,      // show logo in center
  logoSrc = null,
}) {
  const canvasRef = useRef(null)
  const [svgContent, setSvgContent] = useState(null)
  const actualFinderColor = finderColor || fgColor

  useEffect(() => {
    try {
      const qr = new QR(url, { errorCorrection: 'H' })
      const gridSize = qr.gridSize
      const calculatedModuleSize = size / gridSize
      const modules = []

      for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
          const index = y * gridSize + x
          if (!qr.data[index]) continue

          const px = x * calculatedModuleSize
          const py = y * calculatedModuleSize

          if (isFinderPattern(x, y, gridSize)) {
            // Render finder patterns as standard rounded squares
            modules.push(
              <rect
                key={`${x}-${y}`}
                x={px + calculatedModuleSize * 0.05}
                y={py + calculatedModuleSize * 0.05}
                width={calculatedModuleSize * 0.9}
                height={calculatedModuleSize * 0.9}
                rx={isFinderCenter(x, y, gridSize) ? calculatedModuleSize * 0.2 : calculatedModuleSize * 0.1}
                fill={actualFinderColor}
              />
            )
          } else if (iconSvgPath) {
            // Render data modules as the brand icon (SVG path)
            modules.push(
              <svg
                key={`${x}-${y}`}
                x={px}
                y={py}
                width={calculatedModuleSize}
                height={calculatedModuleSize}
                viewBox={iconViewBox}
              >
                <path d={iconSvgPath} fill={fgColor} />
              </svg>
            )
          } else {
            // Default: render as circles (cleaner than squares)
            modules.push(
              <circle
                key={`${x}-${y}`}
                cx={px + calculatedModuleSize / 2}
                cy={py + calculatedModuleSize / 2}
                r={calculatedModuleSize * 0.38}
                fill={fgColor}
              />
            )
          }
        }
      }

      // Center logo overlay
      if (showLogo && logoSrc) {
        const logoSize = size * 0.22
        const logoPos = (size - logoSize) / 2
        modules.push(
          <g key="logo-bg">
            <rect
              x={logoPos - 4}
              y={logoPos - 4}
              width={logoSize + 8}
              height={logoSize + 8}
              rx={8}
              fill={bgColor === 'transparent' ? '#0F0F14' : bgColor}
            />
            <image
              href={logoSrc}
              x={logoPos}
              y={logoPos}
              width={logoSize}
              height={logoSize}
            />
          </g>
        )
      }

      setSvgContent(
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          xmlns="http://www.w3.org/2000/svg"
          style={{ background: bgColor }}
        >
          {modules}
        </svg>
      )
    } catch (err) {
      console.error('QR generation failed:', err)
    }
  }, [url, iconSvgPath, iconViewBox, fgColor, bgColor, finderColor, size, showLogo, logoSrc])

  // Canvas-based rendering for raster icon images
  useEffect(() => {
    if (!iconSrc || iconSvgPath) return
    const canvas = canvasRef.current
    if (!canvas) return

    const qr = new QR(url, { errorCorrection: 'H' })
    const gridSize = qr.gridSize
    const calculatedModuleSize = size / gridSize
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')

    const icon = new Image()
    icon.crossOrigin = 'anonymous'
    icon.onload = () => {
      if (bgColor !== 'transparent') {
        ctx.fillStyle = bgColor
        ctx.fillRect(0, 0, size, size)
      } else {
        ctx.clearRect(0, 0, size, size)
      }

      for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
          const index = y * gridSize + x
          if (!qr.data[index]) continue

          const px = x * calculatedModuleSize
          const py = y * calculatedModuleSize

          if (isFinderPattern(x, y, gridSize)) {
            ctx.fillStyle = actualFinderColor
            const r = isFinderCenter(x, y, gridSize) ? calculatedModuleSize * 0.2 : calculatedModuleSize * 0.1
            roundRect(ctx, px + calculatedModuleSize * 0.05, py + calculatedModuleSize * 0.05,
              calculatedModuleSize * 0.9, calculatedModuleSize * 0.9, r)
            ctx.fill()
          } else {
            ctx.drawImage(icon, px, py, calculatedModuleSize, calculatedModuleSize)
          }
        }
      }

      // Center logo
      if (showLogo && logoSrc) {
        const logoImg = new Image()
        logoImg.crossOrigin = 'anonymous'
        logoImg.onload = () => {
          const logoSize = size * 0.22
          const logoPos = (size - logoSize) / 2
          ctx.fillStyle = bgColor === 'transparent' ? '#0F0F14' : bgColor
          roundRect(ctx, logoPos - 4, logoPos - 4, logoSize + 8, logoSize + 8, 8)
          ctx.fill()
          ctx.drawImage(logoImg, logoPos, logoPos, logoSize, logoSize)
        }
        logoImg.src = logoSrc
      }
    }
    icon.src = iconSrc
  }, [url, iconSrc, iconSvgPath, fgColor, bgColor, finderColor, size, showLogo, logoSrc])

  // If using raster icon, show canvas
  if (iconSrc && !iconSvgPath) {
    return <canvas ref={canvasRef} style={{ width: size, height: size }} />
  }

  return svgContent || null
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
