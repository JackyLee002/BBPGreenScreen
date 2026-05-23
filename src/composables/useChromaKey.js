import { reactive } from 'vue'

const VERTEX_SHADER = `
attribute vec2 a_position;
attribute vec2 a_texCoord;
varying vec2 v_texCoord;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = a_texCoord;
}
`

// 降噪策略 (對應「不要有噪點」需求):
//  1. 走 YCbCr 色彩空間 — 只比色度 (Cb, Cr)，不受亮度浮動影響 → 對陰影、皺褶穩定
//  2. 雙閾值 smoothstep — 內閾值全透明、外閾值全不透明，中間漸變 → 沒鋸齒
//  3. Despill — 壓抑邊緣綠光暈，避免主體看起來「卡」在背景上
//  4. UV cover-crop — 視訊與 canvas 比例不同時，shader 內裁切，避免拉伸變形
const FRAGMENT_SHADER = `
precision mediump float;

uniform sampler2D u_video;
uniform vec3  u_keyColor;
uniform float u_innerThreshold;
uniform float u_outerThreshold;
uniform float u_despillFactor;
uniform float u_videoAspect;
uniform float u_canvasAspect;

varying vec2 v_texCoord;

vec3 rgb2ycbcr(vec3 rgb) {
  float y  = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
  float cb = -0.168736 * rgb.r - 0.331264 * rgb.g + 0.5 * rgb.b + 0.5;
  float cr = 0.5 * rgb.r - 0.418688 * rgb.g - 0.081312 * rgb.b + 0.5;
  return vec3(y, cb, cr);
}

vec2 coverCrop(vec2 uv, float vAspect, float cAspect) {
  vec2 r = uv;
  if (vAspect > cAspect) {
    float scale = cAspect / vAspect;
    r.x = 0.5 + (uv.x - 0.5) * scale;
  } else {
    float scale = vAspect / cAspect;
    r.y = 0.5 + (uv.y - 0.5) * scale;
  }
  return r;
}

void main() {
  vec2 uv = coverCrop(v_texCoord, u_videoAspect, u_canvasAspect);
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    discard;
  }

  vec4 color = texture2D(u_video, uv);

  vec3 yuvKey = rgb2ycbcr(u_keyColor);
  vec3 yuvPix = rgb2ycbcr(color.rgb);
  float dist = distance(yuvPix.yz, yuvKey.yz);

  float alpha = smoothstep(u_innerThreshold, u_outerThreshold, dist);

  float spill = max(color.g - max(color.r, color.b), 0.0);
  color.g -= spill * u_despillFactor;

  gl_FragColor = vec4(color.rgb, alpha);
}
`

function compileShader(gl, type, source) {
  const sh = gl.createShader(type)
  gl.shaderSource(sh, source)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh)
    gl.deleteShader(sh)
    throw new Error('Shader compile error: ' + log)
  }
  return sh
}

function createProgram(gl, vs, fs) {
  const program = gl.createProgram()
  gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, vs))
  gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, fs))
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error('Program link error: ' + gl.getProgramInfoLog(program))
  }
  return program
}

export function useChromaKey() {
  // 預設值已調整為一般綠幕場景可用 — 使用者可在 UI 微調
  const params = reactive({
    keyColor: [0.0, 1.0, 0.0],
    innerThreshold: 0.08,
    outerThreshold: 0.22,
    despillFactor: 1.0
  })

  let gl = null
  let program = null
  let videoTexture = null
  let animationId = null
  let locations = {}
  let _canvas = null
  let _video = null

  function init(canvas, video) {
    _canvas = canvas
    _video = video
    gl = canvas.getContext('webgl', { premultipliedAlpha: false, alpha: true, antialias: true })
    if (!gl) throw new Error('此瀏覽器不支援 WebGL')

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)

    program = createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER)
    gl.useProgram(program)

    // 全螢幕 quad
    const positionBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,   1, -1,  -1,  1,
      -1,  1,   1, -1,   1,  1
    ]), gl.STATIC_DRAW)
    const posLoc = gl.getAttribLocation(program, 'a_position')
    gl.enableVertexAttribArray(posLoc)
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

    const texBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, texBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      0, 0,   1, 0,   0, 1,
      0, 1,   1, 0,   1, 1
    ]), gl.STATIC_DRAW)
    const texLoc = gl.getAttribLocation(program, 'a_texCoord')
    gl.enableVertexAttribArray(texLoc)
    gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 0)

    videoTexture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, videoTexture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

    locations = {
      keyColor: gl.getUniformLocation(program, 'u_keyColor'),
      innerThreshold: gl.getUniformLocation(program, 'u_innerThreshold'),
      outerThreshold: gl.getUniformLocation(program, 'u_outerThreshold'),
      despillFactor: gl.getUniformLocation(program, 'u_despillFactor'),
      videoAspect: gl.getUniformLocation(program, 'u_videoAspect'),
      canvasAspect: gl.getUniformLocation(program, 'u_canvasAspect'),
      video: gl.getUniformLocation(program, 'u_video')
    }
    gl.uniform1i(locations.video, 0)

    animationId = requestAnimationFrame(renderLoop)
  }

  function renderLoop() {
    animationId = requestAnimationFrame(renderLoop)
    if (!_video || !gl) return
    if (_video.readyState < _video.HAVE_CURRENT_DATA) return
    if (_video.videoWidth === 0) return

    gl.viewport(0, 0, _canvas.width, _canvas.height)

    gl.bindTexture(gl.TEXTURE_2D, videoTexture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, _video)

    gl.uniform3fv(locations.keyColor, params.keyColor)
    gl.uniform1f(locations.innerThreshold, params.innerThreshold)
    gl.uniform1f(locations.outerThreshold, params.outerThreshold)
    gl.uniform1f(locations.despillFactor, params.despillFactor)
    gl.uniform1f(locations.videoAspect, _video.videoWidth / _video.videoHeight)
    gl.uniform1f(locations.canvasAspect, _canvas.width / _canvas.height)

    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.drawArrays(gl.TRIANGLES, 0, 6)
  }

  function resize(width, height) {
    if (!_canvas) return
    _canvas.width = width
    _canvas.height = height
  }

  function dispose() {
    if (animationId) cancelAnimationFrame(animationId)
    animationId = null
    if (gl) {
      if (program) gl.deleteProgram(program)
      if (videoTexture) gl.deleteTexture(videoTexture)
    }
    gl = null
    program = null
    videoTexture = null
    _canvas = null
    _video = null
  }

  return { params, init, resize, dispose }
}
