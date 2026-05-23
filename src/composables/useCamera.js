import { ref, onUnmounted } from 'vue'

export function useCamera() {
  const stream = ref(null)
  const error = ref(null)
  const isReady = ref(false)

  async function start(videoEl) {
    error.value = null
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
          facingMode: 'user'
        },
        audio: false
      })
      stream.value = mediaStream
      videoEl.srcObject = mediaStream
      await videoEl.play()

      // 鎖定攝像頭參數 — 減少自動曝光/白平衡造成的綠色亮度浮動，是降噪關鍵
      const track = mediaStream.getVideoTracks()[0]
      const capabilities = typeof track.getCapabilities === 'function' ? track.getCapabilities() : {}
      const advanced = {}
      if (capabilities.exposureMode && capabilities.exposureMode.includes('manual')) {
        advanced.exposureMode = 'manual'
      }
      if (capabilities.whiteBalanceMode && capabilities.whiteBalanceMode.includes('manual')) {
        advanced.whiteBalanceMode = 'manual'
      }
      if (capabilities.focusMode && capabilities.focusMode.includes('manual')) {
        advanced.focusMode = 'manual'
      }
      if (Object.keys(advanced).length > 0) {
        try {
          await track.applyConstraints({ advanced: [advanced] })
        } catch (e) {
          console.warn('無法鎖定攝像頭參數', e)
        }
      }

      isReady.value = true
    } catch (e) {
      if (e.name === 'NotAllowedError') {
        error.value = '攝像頭權限被拒絕，請至瀏覽器設定中重新授權。'
      } else if (e.name === 'NotFoundError') {
        error.value = '找不到可用的攝像頭裝置。'
      } else {
        error.value = e.message || '無法開啟攝像頭'
      }
      isReady.value = false
    }
  }

  function stop() {
    if (stream.value) {
      stream.value.getTracks().forEach(t => t.stop())
      stream.value = null
    }
    isReady.value = false
  }

  onUnmounted(stop)

  return { stream, error, isReady, start, stop }
}
