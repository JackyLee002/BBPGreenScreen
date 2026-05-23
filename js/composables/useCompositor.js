export function useCompositor() {
  function capture({ chromaCanvas, background, ratio, longSide = 1080 }) {
    const aspect = ratio.w / ratio.h
    const outW = aspect >= 1 ? longSide             : Math.round(longSide * aspect)
    const outH = aspect >= 1 ? Math.round(longSide / aspect) : longSide

    const out = document.createElement('canvas')
    out.width  = outW
    out.height = outH
    const ctx  = out.getContext('2d')

    drawBg(ctx, background, outW, outH)
    ctx.drawImage(chromaCanvas, 0, 0, outW, outH)

    return out.toDataURL('image/png')
  }

  function drawBg(ctx, bg, w, h) {
    // 先用白色打底，避免任何分支都漏畫造成整張透明
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, w, h)
    if (!bg) return
    if (bg.type === 'color') {
      ctx.fillStyle = bg.value
      ctx.fillRect(0, 0, w, h)
    } else if (bg.type === 'gradient') {
      ctx.fillStyle = parseGradient(ctx, bg.value, w, h) || '#fff'
      ctx.fillRect(0, 0, w, h)
    } else if (bg.type === 'image' && bg.image) {
      drawCover(ctx, bg.image, 0, 0, w, h)
    }
  }

  // CSS object-fit:cover 的 canvas 等效實作
  function drawCover(ctx, src, dx, dy, dw, dh) {
    const sw = src.naturalWidth  || src.width
    const sh = src.naturalHeight || src.height
    const sa = sw / sh, da = dw / dh
    let sx = 0, sy = 0, cw = sw, ch = sh
    if (sa > da) { cw = sh * da;  sx = (sw - cw) / 2 }
    else         { ch = sw / da;  sy = (sh - ch) / 2 }
    ctx.drawImage(src, sx, sy, cw, ch, dx, dy, dw, dh)
  }

  // 解析 linear-gradient(angle, c1, c2) → CanvasGradient
  function parseGradient(ctx, str, w, h) {
    const m = str.match(/linear-gradient\(([^)]+)\)/i)
    if (!m) return null
    const parts = m[1].split(',').map(s => s.trim())
    let angle = 180, stops = parts
    const am = parts[0].match(/^([\d.]+)deg$/)
    if (am) { angle = parseFloat(am[1]); stops = parts.slice(1) }
    else if (parts[0].startsWith('to ')) { stops = parts.slice(1) }
    const rad = (angle - 90) * Math.PI / 180
    const r = Math.max(w, h)
    const cx = w / 2, cy = h / 2
    const g = ctx.createLinearGradient(
      cx - Math.cos(rad) * r / 2, cy - Math.sin(rad) * r / 2,
      cx + Math.cos(rad) * r / 2, cy + Math.sin(rad) * r / 2
    )
    stops.forEach((c, i) => g.addColorStop(i / Math.max(stops.length - 1, 1), c))
    return g
  }

  return { capture }
}
