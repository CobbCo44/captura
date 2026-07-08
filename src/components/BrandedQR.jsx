import { useState, useEffect, useRef } from 'react'
import generateQR from 'qr.js'

const FINDER_SIZE = 7

function isFinderPattern(x, y, gridSize) {
  if (x < FINDER_SIZE + 1 && y < FINDER_SIZE + 1) return true
  if (x >= gridSize - FINDER_SIZE - 1 && y < FINDER_SIZE + 1) return true
  if (x < FINDER_SIZE + 1 && y >= gridSize - FINDER_SIZE - 1) return true
  return false
}

function seededRandom(seed) {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return [r, g, b]
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('')
}

function lerpColor(color1, color2, t) {
  const [r1, g1, b1] = hexToRgb(color1)
  const [r2, g2, b2] = hexToRgb(color2)
  return rgbToHex(
    r1 + (r2 - r1) * t,
    g1 + (g2 - g1) * t,
    b1 + (b2 - b1) * t
  )
}

// Build a mask from an image: returns a 2D boolean array [gridSize][gridSize]
// true = this grid cell is inside the logo silhouette
function buildMaskFromImage(imgSrc, gridSize) {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = gridSize
      canvas.height = gridSize
      const ctx = canvas.getContext('2d')

      // Draw the logo scaled to fit the grid
      ctx.drawImage(img, 0, 0, gridSize, gridSize)
      const imageData = ctx.getImageData(0, 0, gridSize, gridSize)
      const mask = []

      for (let y = 0; y < gridSize; y++) {
        mask[y] = []
        for (let x = 0; x < gridSize; x++) {
          const i = (y * gridSize + x) * 4
          const alpha = imageData.data[i + 3] // alpha channel
          const r = imageData.data[i]
          const g = imageData.data[i + 1]
          const b = imageData.data[i + 2]
          // Pixel is "filled" if it has decent alpha and isn't near-white
          const brightness = (r + g + b) / 3
          mask[y][x] = alpha > 80 && brightness < 240
        }
      }
      resolve(mask)
    }
    img.onerror = () => {
      // If image fails, return all-true mask (no masking)
      const mask = Array.from({ length: gridSize }, () =>
        Array.from({ length: gridSize }, () => true)
      )
      resolve(mask)
    }
    img.src = imgSrc
  })
}

export default function BrandedQR({
  url = 'https://captura44.netlify.app',
  iconSrc = null,
  iconSvgPath = null,
  iconViewBox = '0 0 24 24',
  fgColor = '#6C2BD9',
  fgColor2 = null,
  bgColor = 'transparent',
  finderColor = null,
  finderStyle = 'rounded',
  size = 300,
  showLogo = false,
  logoSrc = null,
  circularFade = false,
  randomSize = false,
  jitter = false,
  dotScale = 1.0,
  rotateIcons = false,
  // Logo shape masking
  shapeMaskSrc = null,    // image URL to use as shape mask
  shapeMaskSvgPath = null, // SVG path to use as shape mask
  shapeMaskViewBox = '0 0 24 24',
}) {
  const canvasRef = useRef(null)
  const [svgContent, setSvgContent] = useState(null)
  const actualFinderColor = finderColor || fgColor

  useEffect(() => {
    if (iconSrc && !iconSvgPath) return

    async function render() {
      try {
        const code = generateQR(url)
        const matrix = code.modules
        const gridSize = matrix.length
        const modSize = size / gridSize
        const center = gridSize / 2
        const maxDist = center * 1.1
        const rand = seededRandom(url.length * 137 + gridSize)
        const elements = []

        // Build shape mask if provided
        let mask = null
        if (shapeMaskSrc) {
          mask = await buildMaskFromImage(shapeMaskSrc, gridSize)
        }

        // Build SVG path mask if provided
        let svgMask = null
        if (shapeMaskSvgPath && !shapeMaskSrc) {
          // Rasterize SVG path to a mask using canvas
          const maskCanvas = document.createElement('canvas')
          maskCanvas.width = gridSize
          maskCanvas.height = gridSize
          const mctx = maskCanvas.getContext('2d')

          // Parse viewBox
          const vb = shapeMaskViewBox.split(' ').map(Number)
          const scaleX = gridSize / vb[2]
          const scaleY = gridSize / vb[3]

          mctx.fillStyle = 'black'
          mctx.scale(scaleX, scaleY)
          mctx.translate(-vb[0], -vb[1])
          const path2d = new Path2D(shapeMaskSvgPath)
          mctx.fill(path2d)

          const imageData = mctx.getImageData(0, 0, gridSize, gridSize)
          svgMask = []
          for (let y = 0; y < gridSize; y++) {
            svgMask[y] = []
            for (let x = 0; x < gridSize; x++) {
              const i = (y * gridSize + x) * 4
              svgMask[y][x] = imageData.data[i + 3] > 80
            }
          }
        }

        const activeMask = mask || svgMask

        // Draw standard finder patterns (must stay square for scanners)
        // Each finder is a 7x7 grid: outer border, white gap, inner 3x3 block
        const finderOrigins = [
          [0, 0],                          // top-left
          [gridSize - 7, 0],               // top-right
          [0, gridSize - 7],               // bottom-left
        ]

        for (const [ox, oy] of finderOrigins) {
          for (let fy = 0; fy < 7; fy++) {
            for (let fx = 0; fx < 7; fx++) {
              const gx = ox + fx
              const gy = oy + fy
              if (!matrix[gy] || !matrix[gy][gx]) continue

              const px = gx * modSize
              const py = gy * modSize
              elements.push(
                <rect
                  key={`finder-${gx}-${gy}`}
                  x={px}
                  y={py}
                  width={modSize}
                  height={modSize}
                  fill={actualFinderColor}
                />
              )
            }
          }
        }

        // Draw data modules
        // With shape mask: dots INSIDE logo are big/bright, dots OUTSIDE are small/faded
        // All dots stay so QR always scans
        for (let y = 0; y < gridSize; y++) {
          for (let x = 0; x < gridSize; x++) {
            if (!matrix[y][x]) continue
            if (isFinderPattern(x, y, gridSize)) continue

            const rVal = rand()
            const rVal2 = rand()
            const rVal3 = rand()

            // Is this dot inside the logo shape?
            const insideMask = activeMask ? activeMask[y][x] : true

            // Circular fade (only when no mask)
            const dx = x - center
            const dy = y - center
            const dist = Math.sqrt(dx * dx + dy * dy)
            let opacity = 1
            if (circularFade && !activeMask) {
              opacity = Math.max(0, 1 - (dist / maxDist) * 0.6)
              if (dist > maxDist * 1.15) continue
            }

            // Shape mask: inside = full size/opacity, outside = small/faded
            if (activeMask) {
              opacity = insideMask ? 1 : 0.15
            }

            // Gradient color
            let dotColor = fgColor
            if (fgColor2) {
              const t = (x + y) / (gridSize * 2)
              dotColor = lerpColor(fgColor, fgColor2, t)
            }

            // Position
            let px = x * modSize + modSize / 2
            let py = y * modSize + modSize / 2
            if (jitter && insideMask) {
              px += (rVal - 0.5) * modSize * 0.3
              py += (rVal2 - 0.5) * modSize * 0.3
            }

            // Size: inside mask = big, outside = tiny
            let scale = dotScale
            if (activeMask) {
              scale = insideMask ? dotScale * 1.3 : dotScale * 0.4
            }
            if (randomSize && insideMask) {
              scale *= 0.7 + rVal * 0.6
            }

            if (iconSvgPath) {
              const iconSize = modSize * scale
              const rotation = rotateIcons && insideMask ? rVal3 * 360 : 0
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
    }

    render()
  }, [url, iconSvgPath, iconViewBox, fgColor, fgColor2, bgColor, finderColor,
      finderStyle, size, showLogo, logoSrc, iconSrc, circularFade, randomSize,
      jitter, dotScale, rotateIcons, shapeMaskSrc, shapeMaskSvgPath, shapeMaskViewBox])

  // Canvas rendering for raster icon images with mask support
  useEffect(() => {
    if (!iconSrc || iconSvgPath) return
    const canvas = canvasRef.current
    if (!canvas) return

    async function render() {
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

      let activeMask = null
      if (shapeMaskSrc) {
        activeMask = await buildMaskFromImage(shapeMaskSrc, gridSize)
      }

      const icon = new Image()
      icon.crossOrigin = 'anonymous'
      icon.onload = () => {
        if (bgColor !== 'transparent') {
          ctx.fillStyle = bgColor
          ctx.fillRect(0, 0, size, size)
        } else {
          ctx.clearRect(0, 0, size, size)
        }

        // Draw standard finder patterns
        ctx.fillStyle = actualFinderColor
        const finderOrigins = [
          [0, 0],
          [gridSize - 7, 0],
          [0, gridSize - 7],
        ]

        for (const [ox, oy] of finderOrigins) {
          for (let fy = 0; fy < 7; fy++) {
            for (let fx = 0; fx < 7; fx++) {
              const gx = ox + fx
              const gy = oy + fy
              if (!matrix[gy] || !matrix[gy][gx]) continue
              ctx.fillRect(gx * modSize, gy * modSize, modSize, modSize)
            }
          }
        }

        // Draw data modules
        // With mask: inside logo = big/bright, outside = small/faded. All dots stay.
        for (let y = 0; y < gridSize; y++) {
          for (let x = 0; x < gridSize; x++) {
            if (!matrix[y][x]) continue
            if (isFinderPattern(x, y, gridSize)) continue

            const rVal = rand()
            const rVal2 = rand()

            const insideMask = activeMask ? activeMask[y][x] : true

            const dx = x - center
            const dy = y - center
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (circularFade && !activeMask && dist > maxDist * 1.15) continue

            let alpha = 1
            if (circularFade && !activeMask) {
              alpha = Math.max(0, 1 - (dist / maxDist) * 0.6)
            }
            if (activeMask) {
              alpha = insideMask ? 1 : 0.15
            }

            let px = x * modSize
            let py = y * modSize
            if (jitter && insideMask) {
              px += (rVal - 0.5) * modSize * 0.3
              py += (rVal2 - 0.5) * modSize * 0.3
            }

            let scale = dotScale
            if (activeMask) {
              scale = insideMask ? dotScale * 1.3 : dotScale * 0.4
            }
            if (randomSize && insideMask) {
              scale *= 0.7 + rVal * 0.6
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
    }

    render()
  }, [url, iconSrc, iconSvgPath, fgColor, bgColor, finderColor, finderStyle,
      size, showLogo, logoSrc, circularFade, randomSize, jitter, dotScale, rotateIcons,
      shapeMaskSrc, shapeMaskSvgPath])

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
