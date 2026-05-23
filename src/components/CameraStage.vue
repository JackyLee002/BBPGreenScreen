<template>
  <section class="camera-stage">
    <div class="topbar">
      <button class="back-btn" @click="$emit('back')">← 返回設定</button>
      <div class="ratio-tag">{{ store.state.ratio.label }}</div>
    </div>

    <div class="stage-wrap">
      <div class="stage" :style="stageStyle">
        <div class="bg-layer" :style="bgLayerStyle">
          <img
            v-if="store.state.background?.type === 'image'"
            :src="store.state.background.value"
            alt=""
          />
        </div>
        <canvas ref="glCanvasRef" class="gl-canvas"></canvas>
        <video ref="videoRef" autoplay muted playsinline class="hidden-video"></video>
        <div class="crop-guide"></div>
      </div>

      <div v-if="cameraError" class="error-banner">
        ⚠️ {{ cameraError }}
      </div>
    </div>

    <CaptureControls
      :params="chroma.params"
      :ready="ready"
      @capture="onCapture"
    />
  </section>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue'
import CaptureControls from './CaptureControls.vue'
import { useCamera } from '../composables/useCamera.js'
import { useChromaKey } from '../composables/useChromaKey.js'
import { useCompositor } from '../composables/useCompositor.js'
import { usePhotoStore } from '../stores/photoStore.js'

const emit = defineEmits(['back', 'captured'])
const store = usePhotoStore()

const videoRef = ref(null)
const glCanvasRef = ref(null)

const camera = useCamera()
const chroma = useChromaKey()
const compositor = useCompositor()

const cameraError = computed(() => camera.error.value)
const ready = computed(() => camera.isReady.value && !cameraError.value)

const stageStyle = computed(() => {
  const r = store.state.ratio
  return { aspectRatio: `${r.w} / ${r.h}` }
})

const bgLayerStyle = computed(() => {
  const bg = store.state.background
  if (!bg) return {}
  if (bg.type === 'color' || bg.type === 'gradient') return { background: bg.value }
  return {}
})

// canvas 內部解析度 = 目標比例 (長邊 720)
// 視訊與 canvas 比例不同時，shader 內部做 cover-crop，因此 canvas 不會被拉伸
function syncCanvasResolution() {
  if (!glCanvasRef.value) return
  const r = store.state.ratio
  const longSide = 720
  const aspect = r.w / r.h
  let w, h
  if (aspect >= 1) {
    w = longSide
    h = Math.round(longSide / aspect)
  } else {
    h = longSide
    w = Math.round(longSide * aspect)
  }
  chroma.resize(w, h)
}

watch(() => store.state.ratio, () => {
  syncCanvasResolution()
})

onMounted(async () => {
  await nextTick()
  syncCanvasResolution()
  await camera.start(videoRef.value)
  if (camera.isReady.value) {
    try {
      chroma.init(glCanvasRef.value, videoRef.value)
    } catch (e) {
      camera.error.value = e.message
    }
  }
})

onUnmounted(() => {
  chroma.dispose()
  camera.stop()
})

function onCapture() {
  const dataUrl = compositor.capture({
    chromaCanvas: glCanvasRef.value,
    background: store.state.background,
    ratio: store.state.ratio,
    longSide: 1080
  })
  store.setCaptured(dataUrl)
  emit('captured')
}
</script>

<style scoped>
.camera-stage {
  display: flex;
  flex-direction: column;
  gap: 18px;
  align-items: center;
}
.topbar {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.back-btn {
  background: none;
  border: none;
  color: #555;
  font-size: 14px;
  cursor: pointer;
  padding: 4px 0;
  font-family: inherit;
}
.back-btn:hover { color: #111; }
.ratio-tag {
  background: #1f2328;
  color: white;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 999px;
}
.stage-wrap {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.stage {
  position: relative;
  width: 100%;
  max-width: 720px;
  max-height: 65vh;
  background: #0b0d0f;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}
.bg-layer {
  position: absolute;
  inset: 0;
  z-index: 1;
}
.bg-layer img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.gl-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 2;
  display: block;
}
.hidden-video {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}
.crop-guide {
  position: absolute;
  inset: 0;
  z-index: 3;
  border: 1px dashed rgba(255, 255, 255, 0.35);
  pointer-events: none;
}
.error-banner {
  background: #fff1f0;
  color: #c0383a;
  padding: 10px 14px;
  border-radius: 6px;
  margin-top: 10px;
  font-size: 14px;
  border: 1px solid #ffccc7;
}
</style>
