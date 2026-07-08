import { useState, useEffect, useRef } from 'react'
import generateQR from 'qr.js'

const FINDER_SIZE = 7

function isFinderPattern(x, y, gridSize) {
  if (x < FINDER_SIZE + 1 && y < FINDER_SIZE + 1) return true
  if (x >= gridSize - FINDER_SIZE - 1 && y < FINDER_SIZE + 1) return true
  if (x < FINDER_SIZE + 1 && y >= gridSize - FINDER_SIZE - 1) return true
  return false
}

// Seeded random so the same QR always looks the same
function seededRandom(seed) {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

// Parse hex color to RGB
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return [r, g, b]
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('')
}

// Interpolate between two hex colors
function lerpColor(color1, color2, t) {
  const [r1, g1, b1] = hexToRgb(color1)
  const [r2, g2, b2] = hexToRgb(color2)
  return rgbToHex(
    r1 + (r2 - r1) * t,
    g1 + (g2 - g1) * t,
    b1 + (b2 - b1) * t
  )
}

export default function BrandedQR({
  url = 'https://captura44.netlify.app',
  iconSrc = null,
  iconSvgPath = null,
  iconViewBox = '0 0 24 24',
  fgColor = '#6C2BD9',
  fgColor2 = null,          // second color for gradient effect
  bgColor = 'transparent',
  finderColor = null,
  finderStyle = 'rounded',  // 'square', 'rounded', 'circle', 'diamond'
  size = 300,
  showLogo = false,
  logoSrc = null,
  // New style options
  circularFade = false,     // fade dots toward edges for circular shape
  randomSize = false,       // vary dot sizes
  jitter = false,           // slight random position offset
  dotScale = 1.0,           // overall dot scale multiplier
  rotateIcons = false,      // randomly rotate icon dots
}) {
  const canvasRef = useRef(null)
  const [svgContent, setSvgContent] = useState(null)
  const actualFinderColor = finderColor || fgColor

  useEffect(() => {
    if (iconSrc && !iconSvgPath) return

    try {
      const code = generateQR(url)
      const matrix = code.modules
      const gridSize = matrix.length
      const modSize = size / gridSize
      const center = gridSize / 2
      const maxDist = center * 1.1
      const rand = seededRandom(url.length * 137 + gridSize)
      const elements = []

      // Draw custom finder patterns
      const finderCenters = [
        [3.5, 3.5],
        [gridSize - 3.5, 3.5],
        [3.5, gridSize - 3.5],
      ]

      for (const [fcx, fcy] of finderCenters) {
        const px = fcx * modSize
        const py = fcy * modSize

        if (finderStyle === 'circle') {
          // Outer ring
          elements.push(
            <circle key={`fo-${fcx}-${fcy}`} cx={px} cy={py} r={modSize * 3.4}
              fill="none" stroke={actualFinderColor} strokeWidth={modSize * 0.9} />
          )
          // Inner dot
          elements.push(
            <circle key={`fi-${fcx}-${fcy}`} cx={px} cy={py} r={modSize * 1.4}
              fill={actualFinderColor} />
          )
        } else if (finderStyle === 'diamond') {
          const s = modSize * 3.5
          const si = modSize * 1.5
          elements.push(
            <polygon key={`fo-${fcx}-${fcy}`}
              points={`${px},${py - s} ${px + s},${py} ${px},${py + s} ${px - s},${py}`}
              fill="none" stroke={actualFinderColor} strokeWidth={modSize * 0.8} />
          )
          elements.push(
            <polygon key={`fi-${fcx}-${fcy}`}
              points={`${px},${py - si} ${px + si},${py} ${px},${py + si} ${px - si},${py}`}
              fill={actualFinderColor} />
          )
        } else if (finderStyle === 'rounded') {
          const outerSize = modSize * 7
          const innerSize = modSize * 3
          elements.push(
            <rect key={`fo-${fcx}-${fcy}`}
              x={px - outerSize / 2} y={py - outerSize / 2}
              width={outerSize} height={outerSize}
              rx={modSize * 2} fill="none"
              stroke={actualFinderColor} strokeWidth={modSize * 0.85} />
          )
          elements.push(
            <rect key={`fi-${fcx}-${fcy}`}
              x={px - innerSize / 2} y={py - innerSize / 2}
              width={innerSize} height={innerSize}
              rx={modSize * 0.8} fill={actualFinderColor} />
          )
        } else {
          // square
          const outerSize = modSize * 7
          const innerSize = modSize * 3
          elements.push(
            <rect key={`fo-${fcx}-${fcy}`}
              x={px - outerSize / 2} y={py - outerSize / 2}
              width={outerSize} height={outerSize}
              fill="none" stroke={actualFinderColor} strokeWidth={modSize * 0.85} />
          )
          elements.push(
            <rect key={`fi-${fcx}-${fcy}`}
              x={px - innerSize / 2} y={py - innerSize / 2}
              width={innerSize} height={innerSize}
              fill={actualFinderColor} />
          )
        }
      }

      // Draw data modules
      for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
          if (!matrix[y][x]) continue
          if (isFinderPattern(x, y, gridSize)) continue

          const rVal = rand()
          const rVal2 = rand()
          const rVal3 = rand()

          // Circular fade
          const dx = x - center
          const dy = y - center
          const dist = Math.sqrt(dx * dx + dy * dy)
          let opacity = 1
          if (circularFade) {
            opacity = Math.max(0, 1 - (dist / maxDist) * 0.6)
            if (dist > maxDist * 1.15) continue // skip dots outside circle
          }

          // Gradient color
          let dotColor = fgColor
          if (fgColor2) {
            const t = (x + y) / (gridSize * 2)
            dotColor = lerpColor(fgColor, fgColor2, t)
          }

          // Position with optional jitter
          let px = x * modSize + modSize / 2
          let py = y * modSize + modSize / 2
          if (jitter) {
            px += (rVal - 0.5) * modSize * 0.3
            py += (rVal2 - 0.5) * modSize * 0.3
          }

          // Size with optional randomization
          let scale = dotScale
          if (randomSize) {
            scale *= 0.6 + rVal * 0.8 // range: 0.6x to 1.4x
          }

          if (iconSvgPath) {
            const iconSize = modSize * scale
            const rotation = rotateIcons ? rVal3 * 360 : 0
            elements.push(
              <g key={`${x}-${y}`}
                transform={`translate(${px}, ${py}) rotate(${rotation})`}
                opacity={opacity}
              >
                <svg
                  x={-iconSize / 2}
                  y={-iconSize / 2}
                  width={iconSize}
                  height={iconSize}
                  viewBox={iconViewBox}
                >
                  <path d={iconSvgPath} fill={dotColor} />
                </svg>
              </g>
            )
          } else {
            elements.push(
              <circle
                key={`${x}-${y}`}
                cx={px}
                cy={py}
                r={modSize * 0.38 * scale}
                fill={dotColor}
                opacity={opacity}
              />
            )
          }
        }
      }

      // Center logo
      if (showLogo && logoSrc) {
        const logoSize = size * 0.22
        const logoPos = (size - logoSize) / 2
        elements.push(
          <g key="logo-bg">
            <rect
              x={logoPos - 6} y={logoPos - 6}
              width={logoSize + 12} height={logoSize + 12}
              rx={10}
              fill={bgColor === 'transparent' ? '#0F0F14' : bgColor}
            />
            <image href={logoSrc}
              x={logoPos} y={logoPos}
              width={logoSize} height={logoSize}
            />
          </g>
        )
      }

      setSvgContent(
        <svg
          width={size} height={size}
          viewBox={`0 0 ${size} ${size}`}
          xmlns="http://www.w3.org/2000/svg"
          style={{ background: bgColor }}
        >
          {elements}
        </svg>
      )
    } catch (err) {
      console.error('QR generation failed:', err)
    }
  }, [url, iconSvgPath, iconViewBox, fgColor, fgColor2, bgColor, finderColor,
      finderStyle, size, showLogo, logoSrc, iconSrc, circularFade, randomSize,
      jitter, dotScale, rotateIcons])

  // Canvas rendering for raster images
  useEffect(() => {
    if (!iconSrc || iconSvgPath) return
    const canvas = canvasRef.current
    if (!canvas) return

    const code = generateQR(url)
    const matrix = code.modules
    const gridSize = matrix.length
    const modSize = size / gridSize
    const center = gridSize / 2
    const maxDist = center * 1.1
    const rand = seededRandom(url.length * 137 + gridSize)
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

      // Draw finder patterns
      ctx.fillStyle = actualFinderColor
      ctx.strokeStyle = actualFinderColor
      ctx.lineWidth = modSize * 0.85

      const finderCenters = [
        [3.5 * modSize, 3.5 * modSize],
        [(gridSize - 3.5) * modSize, 3.5 * modSize],
        [3.5 * modSize, (gridSize - 3.5) * modSize],
      ]

      for (const [fcx, fcy] of finderCenters) {
        if (finderStyle === 'circle') {
          ctx.beginPath()
          ctx.arc(fcx, fcy, modSize * 3.4, 0, Math.PI * 2)
          ctx.stroke()
          ctx.beginPath()
          ctx.arc(fcx, fcy, modSize * 1.4, 0, Math.PI * 2)
          ctx.fill()
        } else {
          const os = modSize * 7
          const is2 = modSize * 3
          const r = finderStyle === 'rounded' ? modSize * 2 : 0
          const ri = finderStyle === 'rounded' ? modSize * 0.8 : 0
          roundRect(ctx, fcx - os / 2, fcy - os / 2, os, os, r)
          ctx.stroke()
          roundRect(ctx, fcx - is2 / 2, fcy - is2 / 2, is2, is2, ri)
          ctx.fill()
        }
      }

      // Draw data modules
      for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
          if (!matrix[y][x]) continue
          if (isFinderPattern(x, y, gridSize)) continue

          const rVal = rand()
          const rVal2 = rand()

          const dx = x - center
          const dy = y - center
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (circularFade && dist > maxDist * 1.15) continue

          let alpha = 1
          if (circularFade) {
            alpha = Math.max(0, 1 - (dist / maxDist) * 0.6)
          }

          let px = x * modSize
          let py = y * modSize
          if (jitter) {
            px += (rVal - 0.5) * modSize * 0.3
            py += (rVal2 - 0.5) * modSize * 0.3
          }

          let scale = dotScale
          if (randomSize) {
            scale *= 0.6 + rVal * 0.8
          }

          ctx.globalAlpha = alpha
          const drawSize = modSize * scale
          ctx.drawImage(icon, px + (modSize - drawSize) / 2, py + (modSize - drawSize) / 2, drawSize, drawSize)
        }
      }
      ctx.globalAlpha = 1

      if (showLogo && logoSrc) {
        const logoImg = new Image()
        logoImg.crossOrigin = 'anonymous'
        logoImg.onload = () => {
          const logoSize = size * 0.22
          const logoPos = (size - logoSize) / 2
          ctx.fillStyle = bgColor === 'transparent' ? '#0F0F14' : bgColor
          roundRect(ctx, logoPos - 6, logoPos - 6, logoSize + 12, logoSize + 12, 10)
          ctx.fill()
          ctx.drawImage(logoImg, logoPos, logoPos, logoSize, logoSize)
        }
        logoImg.src = logoSrc
      }
    }
    icon.src = iconSrc
  }, [url, iconSrc, iconSvgPath, fgColor, bgColor, finderColor, finderStyle,
      size, showLogo, logoSrc, circularFade, randomSize, jitter, dotScale, rotateIcons])

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
