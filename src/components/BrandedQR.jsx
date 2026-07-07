import { useState, useEffect, useRef } from 'react'
import QRCode from 'qr.js'

const FINDER_SIZE = 7

function isFinderPattern(x, y, gridSize) {
  if (x < FINDER_SIZE + 1 && y < FINDER_SIZE + 1) return true
  if (x >= gridSize - FINDER_SIZE - 1 && y < FINDER_SIZE + 1) return true
  if (x < FINDER_SIZE + 1 && y >= gridSize - FINDER_SIZE - 1) return true
  return false
}

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
  iconSrc = null,
  iconSvgPath = null,
  iconViewBox = '0 0 24 24',
  fgColor = '#6C2BD9',
  bgColor = 'transparent',
  finderColor = null,
  size = 300,
  showLogo = false,
  logoSrc = null,
}) {
  const canvasRef = useRef(null)
  const [svgContent, setSvgContent] = useState(null)
  const actualFinderColor = finderColor || fgColor

  // SVG-based rendering (for SVG path icons or default circles)
  useEffect(() => {
    if (iconSrc && !iconSvgPath) return // use canvas path instead

    try {
      const qr = new QRCode(url, { errorCorrectLevel: 'H' })
      const matrix = qr.modules
      const gridSize = matrix.length
      const modSize = size / gridSize
      const modules = []

      for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
          if (!matrix[y][x]) continue

          const px = x * modSize
          const py = y * modSize

          if (isFinderPattern(x, y, gridSize)) {
            modules.push(
              <rect
                key={`${x}-${y}`}
                x={px + modSize * 0.05}
                y={py + modSize * 0.05}
                width={modSize * 0.9}
                height={modSize * 0.9}
                rx={isFinderCenter(x, y, gridSize) ? modSize * 0.2 : modSize * 0.1}
                fill={actualFinderColor}
              />
            )
          } else if (iconSvgPath) {
            modules.push(
              <svg
                key={`${x}-${y}`}
                x={px}
                y={py}
                width={modSize}
                height={modSize}
                viewBox={iconViewBox}
              >
                <path d={iconSvgPath} fill={fgColor} />
              </svg>
            )
          } else {
            modules.push(
              <circle
                key={`${x}-${y}`}
                cx={px + modSize / 2}
                cy={py + modSize / 2}
                r={modSize * 0.38}
                fill={fgColor}
              />
            )
          }
        }
      }

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
  }, [url, iconSvgPath, iconViewBox, fgColor, bgColor, finderColor, size, showLogo, logoSrc, iconSrc])

  // Canvas-based rendering for raster icon images
  useEffect(() => {
    if (!iconSrc || iconSvgPath) return
    const canvas = canvasRef.current
    if (!canvas) return

    const qr = new QRCode(url, { errorCorrectLevel: 'H' })
    const matrix = qr.modules
    const gridSize = matrix.length
    const modSize = size / gridSize
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
          if (!matrix[y][x]) continue

          const px = x * modSize
          const py = y * modSize

          if (isFinderPattern(x, y, gridSize)) {
            ctx.fillStyle = actualFinderColor
            const r = isFinderCenter(x, y, gridSize) ? modSize * 0.2 : modSize * 0.1
            roundRect(ctx, px + modSize * 0.05, py + modSize * 0.05,
              modSize * 0.9, modSize * 0.9, r)
            ctx.fill()
          } else {
            ctx.drawImage(icon, px, py, modSize, modSize)
          }
        }
      }

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
