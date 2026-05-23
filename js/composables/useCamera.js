import { ref, onUnmounted } from 'vue'

export function useCamera() {
  const error = ref(null)
  const isReady = ref(false)
  let _stream = null

  async function start(videoEl) {
    error.value = null
    try {
      _stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width:     { ideal: 1280 },
          height:    { ideal: 720 },
          frameRate: { ideal: 30 },
          facingMode: 'user'
        },
        audio: false
      })
      videoEl.srcObject = _stream
      await videoEl.play()

      // 鎖定曝光/白平衡 — 避免自動調整造成綠色亮度浮動 (降噪關鍵)
      const track = _stream.getVideoTracks()[0]
      const caps = typeof track.getCapabilities === 'function' ? track.getCapabilities() : {}
      const adv = {}
      if (caps.exposureMode?.includes?.('manual'))      adv.exposureMode = 'manual'
      if (caps.whiteBalanceMode?.includes?.('manual'))  adv.whiteBalanceMode = 'manual'
      if (caps.focusMode?.includes?.('manual'))         adv.focusMode = 'manual'
      if (Object.keys(adv).length > 0) {
        try { await track.applyConstraints({ advanced: [adv] }) }
        catch (e) { console.warn('無法鎖定攝像頭參數', e) }
      }

      isReady.value = true
    } catch (e) {
      if (e.name === 'NotAllowedError')
        error.value = '攝像頭權限被拒絕，請至瀏覽器設定中重新授權。'
      else if (e.name === 'NotFoundError')
        error.value = '找不到可用的攝像頭裝置。'
      else
        error.value = e.message || '無法開啟攝像頭'
      isReady.value = false
    }
  }

  function stop() {
    _stream?.getTracks().forEach(t => t.stop())
    _stream = null
    isReady.value = false
  }

  onUnmounted(stop)

  return { error, isReady, start, stop }
}
