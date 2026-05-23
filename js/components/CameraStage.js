import { defineComponent, ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
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
          <canvas ref="glCanvas" class="stage-canvas"></canvas>
          <video  ref="video" autoplay muted playsinline class="stage-video"></video>
          <div class="stage-crop-guide"></div>
        </div>
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

    function syncResolution() {
      if (!glCanvas.value) return
      const r = store.state.ratio
      const longSide = 720
      const aspect   = r.w / r.h
      const w = aspect >= 1 ? longSide             : Math.round(longSide * aspect)
      const h = aspect >= 1 ? Math.round(longSide / aspect) : longSide
      chroma.resize(w, h)
    }

    watch(() => store.state.ratio, syncResolution)

    onMounted(async () => {
      await nextTick()
      syncResolution()
      await camera.start(video.value)
      if (camera.isReady.value) {
        try { chroma.init(glCanvas.value, video.value) }
        catch (e) { camera.error.value = e.message }
      }
    })

    onUnmounted(() => {
      chroma.dispose()
      camera.stop()
    })

    function onCapture() {
      const url = comp.capture({
        chromaCanvas: glCanvas.value,
        background: store.state.background,
        ratio: store.state.ratio,
        longSide: 1080
      })
      store.setCaptured(url)
      emit('captured')
    }

    return { store, glCanvas, video, chroma, cameraError, ready, stageStyle, bgStyle, onCapture }
  }
})
