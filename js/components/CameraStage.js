import { defineComponent, ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import CaptureControls from './CaptureControls.js'
import { useCamera } from '../composables/useCamera.js'
import { useChromaKey } from '../composables/useChromaKey.js'
import { useCompositor } from '../composables/useCompositor.js'
import { useStore } from '../store.js'

export default defineComponent({
  name: 'CameraStage',
  components: { CaptureControls },
  emits: ['back', 'captured'],
  template: `
    <section class="camera-stage">
      <div class="stage-topbar">
        <button class="stage-back-btn" @click="$emit('back')">← 返回設定</button>
        <span class="stage-ratio-tag">{{ store.state.ratio.label }}</span>
      </div>

      <div class="stage-wrap">
        <div class="stage" :style="stageStyle">
          <div class="stage-bg" :style="bgStyle"></div>
          <img v-if="store.state.background?.type === 'image'"
               :src="store.state.background.value"
               class="stage-bg"
               alt="" />
          <canvas ref="glCanvas" class="stage-canvas" @click="onPickColor"></canvas>
          <video  ref="video" autoplay muted playsinline class="stage-video"></video>
          <div class="stage-crop-guide"></div>
        </div>
        <p class="stage-pick-tip">👆 點擊畫面上的綠幕區域可校正去背顏色</p>
        <div v-if="cameraError" class="stage-error">⚠️ {{ cameraError }}</div>
      </div>

      <CaptureControls :params="chroma.params" :ready="ready" @capture="onCapture" />
    </section>
  `,
  setup(_, { emit }) {
    const store = useStore()
    const glCanvas = ref(null)
    const video    = ref(null)
    const camera   = useCamera()
    const chroma   = useChromaKey()
    const comp     = useCompositor()

    const cameraError = computed(() => camera.error.value)
    const ready       = computed(() => camera.isReady.value && !camera.error.value)

    const stageStyle = computed(() => {
      const r = store.state.ratio
      return { aspectRatio: `${r.w} / ${r.h}` }
    })

    const bgStyle = computed(() => {
      const bg = store.state.background
      if (!bg) return {}
      if (bg.type === 'color' || bg.type === 'gradient') return { background: bg.value }
      return {}
    })

    let resizeObserver = null

    function setCanvasResolution() {
      const el = glCanvas.value
      if (!el) return
      const dpr = window.devicePixelRatio || 1
      const w = Math.round(el.clientWidth  * dpr)
      const h = Math.round(el.clientHeight * dpr)
      if (w > 0 && h > 0) {
        el.width  = w
        el.height = h
        chroma.resize(w, h)
      }
    }

    onMounted(async () => {
      await nextTick()
      setCanvasResolution()
      resizeObserver = new ResizeObserver(setCanvasResolution)
      resizeObserver.observe(glCanvas.value)

      await camera.start(video.value)
      if (camera.isReady.value) {
        try { chroma.init(glCanvas.value, video.value) }
        catch (e) { camera.error.value = e.message }
      }
    })

    onUnmounted(() => {
      resizeObserver?.disconnect()
      chroma.dispose()
      camera.stop()
    })

    function onCapture() {
      // 在 drawImage 讀取前強制同步渲染，避免 WebGL framebuffer 與 2D ctx 之間的時序問題
      chroma.render()
      const url = comp.capture({
        chromaCanvas: glCanvas.value,
        background: store.state.background,
        ratio: store.state.ratio,
        longSide: 1080
      })
      store.setCaptured(url)
      emit('captured')
    }

    function onPickColor(e) {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width
      const y = (e.clientY - rect.top)  / rect.height
      chroma.pickColorAt(x, y)
    }

    return { store, glCanvas, video, chroma, cameraError, ready, stageStyle, bgStyle, onCapture, onPickColor }
  }
})
