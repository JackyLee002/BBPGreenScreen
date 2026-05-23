// 拍照時把背景與去背畫面合成輸出。
// chromaCanvas 內部已是「目標比例」尺寸 (由 CameraStage 控制)，所以可以直接 1:1 疊上去。

export function useCompositor() {
  function capture({ chromaCanvas, background, ratio, longSide = 1080 }) {
    const aspect = ratio.w / ratio.h
    let outW, outH
    if (aspect >= 1) {
      outW = longSide
      outH = Math.round(longSide / aspect)
    } else {
      outH = longSide
      outW = Math.round(longSide * aspect)
    }

    const out = document.createElement('canvas')
    out.width = outW
    out.height = outH
    const ctx = out.getContext('2d')

    drawBackground(ctx, background, outW, outH)
    ctx.drawImage(chromaCanvas, 0, 0, outW, outH)

    return out.toDataURL('image/png')
  }

  function drawBackground(ctx, bg, w, h) {
    if (!bg) {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, w, h)
      return
    }
    if (bg.type === 'color') {
      ctx.fillStyle = bg.value
      ctx.fillRect(0, 0, w, h)
      return
    }
    if (bg.type === 'gradient') {
      const grad = parseLinearGradient(ctx, bg.value, w, h)
      ctx.fillStyle = grad || '#ffffff'
      ctx.fillRect(0, 0, w, h)
      return
    }
    if (bg.type === 'image' && bg.image) {
      drawCover(ctx, bg.image, 0, 0, w, h)
      return
    }
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
  }

  // 用 cover 規則繪製來源 (置中裁切)
  function drawCover(ctx, source, dx, dy, dw, dh) {
    const sw = source.naturalWidth || source.width
    const sh = source.naturalHeight || source.height
    const sa = sw / sh
    const da = dw / dh
    let sx = 0, sy = 0, cropW = sw, cropH = sh
    if (sa > da) {
      cropW = sh * da
      sx = (sw - cropW) / 2
    } else {
      cropH = sw / da
      sy = (sh - cropH) / 2
    }
    ctx.drawImage(source, sx, sy, cropW, cropH, dx, dy, dw, dh)
  }

  // 解析簡單的 linear-gradient(angle, c1, c2) 字串成 canvas gradient
  function parseLinearGradient(ctx, str, w, h) {
    const m = str.match(/linear-gradient\(([^)]+)\)/i)
    if (!m) return null
    const parts = m[1].split(',').map(s => s.trim())
    let angle = 180
    let stops = parts
    const angleMatch = parts[0].match(/^([\d.]+)deg$/)
    if (angleMatch) {
      angle = parseFloat(angleMatch[1])
      stops = parts.slice(1)
    } else if (parts[0].startsWith('to ')) {
      stops = parts.slice(1)
    }
    const rad = (angle - 90) * Math.PI / 180
    const cx = w / 2, cy = h / 2
    const r = Math.max(w, h)
    const x1 = cx - Math.cos(rad) * r / 2
    const y1 = cy - Math.sin(rad) * r / 2
    const x2 = cx + Math.cos(rad) * r / 2
    const y2 = cy + Math.sin(rad) * r / 2
    const grad = ctx.createLinearGradient(x1, y1, x2, y2)
    stops.forEach((c, i) => {
      grad.addColorStop(i / Math.max(stops.length - 1, 1), c)
    })
    return grad
  }

  return { capture }
}
