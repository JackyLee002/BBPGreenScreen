import { reactive } from 'vue'

/* ── Vertex shader ─ 全螢幕 quad ───────────────────── */
const VS = `
attribute vec2 a_pos;
attribute vec2 a_uv;
varying vec2 v_uv;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
  v_uv = a_uv;
}`

/* ── Fragment shader ─────────────────────────────────
 * 降噪策略：
 *  1. 走 YCbCr 色彩空間，只比較色度 (Cb/Cr)
 *     → 不受亮度浮動影響，對陰影/皺褶穩定
 *  2. smoothstep 雙閾值 soft-edge
 *     → 邊緣漸變透明，消除鋸齒
 *  3. Despill（去綠光暈）
 *     → 壓抑主體邊緣殘留的綠色 spill
 *  4. coverCrop
 *     → shader 內對視訊做 cover 裁切，canvas 不拉伸
 * ─────────────────────────────────────────────────── */
const FS = `
precision mediump float;

uniform sampler2D u_video;
uniform vec3  u_key;
uniform float u_inner;
uniform float u_outer;
uniform float u_despill;
uniform float u_vAspect;
uniform float u_cAspect;

varying vec2 v_uv;

vec3 toYCbCr(vec3 c) {
  float y  =  0.299   * c.r + 0.587   * c.g + 0.114   * c.b;
  float cb = -0.168736* c.r - 0.331264* c.g + 0.5     * c.b + 0.5;
  float cr =  0.5     * c.r - 0.418688* c.g - 0.081312* c.b + 0.5;
  return vec3(y, cb, cr);
}

vec2 coverUV(vec2 uv, float va, float ca) {
  vec2 r = uv;
  if (va > ca) { float s = ca / va; r.x = 0.5 + (uv.x - 0.5) * s; }
  else         { float s = va / ca; r.y = 0.5 + (uv.y - 0.5) * s; }
  return r;
}

void main() {
  vec2 uv = coverUV(v_uv, u_vAspect, u_cAspect);
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) discard;

  vec4 col   = texture2D(u_video, uv);
  vec3 yuvK  = toYCbCr(u_key);
  vec3 yuvP  = toYCbCr(col.rgb);
  float dist = distance(yuvP.yz, yuvK.yz);
  float alpha = smoothstep(u_inner, u_outer, dist);

  // only despill near keyed edges; fully opaque pixels are untouched
  float spill = max(col.g - max(col.r, col.b), 0.0);
  col.g -= spill * u_despill * (1.0 - alpha);

  gl_FragColor = vec4(col.rgb, alpha);
}`

function mkShader(gl, type, src) {
  const s = gl.createShader(type)
  gl.shaderSource(s, src); gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
    throw new Error(gl.getShaderInfoLog(s))
  return s
}
function mkProgram(gl, vs, fs) {
  const p = gl.createProgram()
  gl.attachShader(p, mkShader(gl, gl.VERTEX_SHADER, vs))
  gl.attachShader(p, mkShader(gl, gl.FRAGMENT_SHADER, fs))
  gl.linkProgram(p)
  if (!gl.getProgramParameter(p, gl.LINK_STATUS))
    throw new Error(gl.getProgramInfoLog(p))
  return p
}

export function useChromaKey() {
  const params = reactive({
    keyColor: [0.0, 1.0, 0.0],
    inner: 0.08,
    outer: 0.22,
    despill: 1.0
  })

  let gl, prog, tex, rafId, loc = {}
  let _canvas, _video

  function init(canvas, video) {
    _canvas = canvas
    _video  = video
    gl = canvas.getContext('webgl', { premultipliedAlpha: false, alpha: true })
    if (!gl) throw new Error('此瀏覽器不支援 WebGL')

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
    prog = mkProgram(gl, VS, FS)
    gl.useProgram(prog)

    // 全螢幕 quad (兩個三角形)
    const posB = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, posB)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1,-1,  1,-1,  -1,1,
      -1, 1,  1,-1,   1,1
    ]), gl.STATIC_DRAW)
    const aPos = gl.getAttribLocation(prog, 'a_pos')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    const uvB = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, uvB)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      0,0, 1,0, 0,1,
      0,1, 1,0, 1,1
    ]), gl.STATIC_DRAW)
    const aUV = gl.getAttribLocation(prog, 'a_uv')
    gl.enableVertexAttribArray(aUV)
    gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, 0, 0)

    tex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

    loc = {
      key:     gl.getUniformLocation(prog, 'u_key'),
      inner:   gl.getUniformLocation(prog, 'u_inner'),
      outer:   gl.getUniformLocation(prog, 'u_outer'),
      despill: gl.getUniformLocation(prog, 'u_despill'),
      vAspect: gl.getUniformLocation(prog, 'u_vAspect'),
      cAspect: gl.getUniformLocation(prog, 'u_cAspect'),
      video:   gl.getUniformLocation(prog, 'u_video')
    }
    gl.uniform1i(loc.video, 0)
    rafId = requestAnimationFrame(loop)
  }

  function loop() {
    rafId = requestAnimationFrame(loop)
    if (!gl || !_video || _video.readyState < 2 || !_video.videoWidth) return

    gl.viewport(0, 0, _canvas.width, _canvas.height)
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, _video)

    gl.uniform3fv(loc.key,     params.keyColor)
    gl.uniform1f(loc.inner,   params.inner)
    gl.uniform1f(loc.outer,   params.outer)
    gl.uniform1f(loc.despill, params.despill)
    gl.uniform1f(loc.vAspect, _video.videoWidth / _video.videoHeight)
    gl.uniform1f(loc.cAspect, _canvas.width   / _canvas.height)

    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.drawArrays(gl.TRIANGLES, 0, 6)
  }

  function resize(w, h) {
    if (_canvas) { _canvas.width = w; _canvas.height = h }
  }

  function dispose() {
    if (rafId) cancelAnimationFrame(rafId)
    rafId = null
    if (gl) {
      if (prog) gl.deleteProgram(prog)
      if (tex)  gl.deleteTexture(tex)
    }
    gl = prog = tex = _canvas = _video = null
  }

  return { params, init, resize, dispose }
}
