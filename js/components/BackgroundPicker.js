import { defineComponent, computed, reactive, ref } from 'vue'
import { useStore } from '../store.js'

export default defineComponent({
  name: 'BackgroundPicker',
  template: `
    <div>
      <div class="bg-picker">
        <!-- 預設圖片來源：點擊開裁切 modal -->
        <button
          v-for="src in store.presetSources"
          :key="src.id"
          class="bg-card"
          :style="{ backgroundImage: 'url(' + src.src + ')', backgroundSize: 'cover', backgroundPosition: 'center' }"
          @click="openPresetCrop(src)"
        >
          <span class="bg-card-label">{{ src.label }}</span>
        </button>

        <!-- 已裁切的自訂背景：直接選取 -->
        <button
          v-for="bg in store.state.customBackgrounds"
          :key="bg.id"
          class="bg-card"
          :class="{ active: isSelected(bg) }"
          :style="{ backgroundImage: 'url(' + bg.value + ')', backgroundSize: 'cover', backgroundPosition: 'center' }"
          @click="store.setBackground(bg)"
        >
          <span class="bg-card-label">{{ bg.label }}</span>
        </button>

        <!-- 上傳自訂圖片 -->
        <label class="bg-card bg-upload" title="上傳自訂背景">
          <input type="file" accept="image/*" style="display:none" @change="onUpload" />
          <span class="bg-upload-icon">+</span>
          <span class="bg-upload-text">上傳背景</span>
        </label>
      </div>

      <!-- 裁切 Modal -->
      <div v-if="crop.open" class="crop-overlay"
           @mouseup="onDragEnd" @touchend="onDragEnd" @mouseleave="onDragEnd">
        <div class="crop-modal">
          <p class="crop-title">調整裁切範圍</p>
          <p class="crop-hint">拖曳圖片選擇想保留的區域（比例：{{ ratio.label }}）</p>
          <div class="crop-frame" ref="frameRef"
               :style="{ aspectRatio: ratio.w + '/' + ratio.h }"
               @mousedown.prevent="onDragStart"
               @touchstart.prevent="onTouchStart"
               @mousemove="onMouseMove"
               @touchmove.prevent="onTouchMove">
            <img :src="crop.previewSrc" class="crop-img" draggable="false"
                 :style="{ objectPosition: crop.offsetX + '% ' + crop.offsetY + '%' }" />
          </div>
          <div class="crop-actions">
            <button class="btn-primary" @click="confirmCrop">確認使用</button>
            <button class="btn-secondary" @click="crop.open = false">取消</button>
          </div>
        </div>
      </div>
    </div>
  `,
  setup() {
    const store = useStore()
    const frameRef = ref(null)
    const ratio = computed(() => store.state.ratio)

    const crop = reactive({
      open: false,
      previewSrc: '',   // 給 <img> 顯示用（路徑或 dataURL）
      img: null,        // 給 drawImage 用的 HTMLImageElement
      label: '',
      isUpload: false,  // true = 上傳的新圖，確認後加入自訂清單
      offsetX: 50,
      offsetY: 50,
      dragging: false,
      lastX: 0,
      lastY: 0
    })

    function isSelected(bg) {
      const cur = store.state.background
      if (!cur || !cur.id || !bg.id) return false
      return cur.id === bg.id
    }

    // 預設圖片點擊
    function openPresetCrop(source) {
      const img = new Image()
      img.onload = () => {
        crop.img = img
        crop.previewSrc = source.src
        crop.label = source.label
        crop.isUpload = false
        crop.offsetX = 50
        crop.offsetY = 50
        crop.open = true
      }
      img.src = source.src
    }

    // 上傳圖片
    function onUpload(e) {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        const img = new Image()
        img.onload = () => {
          crop.img = img
          crop.previewSrc = reader.result
          crop.label = '自訂'
          crop.isUpload = true
          crop.offsetX = 50
          crop.offsetY = 50
          crop.open = true
        }
        img.src = reader.result
      }
      reader.readAsDataURL(file)
      e.target.value = ''
    }

    // 拖曳邏輯
    function applyDelta(clientX, clientY) {
      if (!crop.dragging || !frameRef.value || !crop.img) return
      const dx = clientX - crop.lastX
      const dy = clientY - crop.lastY
      crop.lastX = clientX
      crop.lastY = clientY

      const frame = frameRef.value
      const cw = frame.clientWidth
      const ch = frame.clientHeight
      const imgA = crop.img.naturalWidth / crop.img.naturalHeight
      const conA = cw / ch

      if (imgA > conA) {
        const overflow = ch * imgA - cw
        if (overflow > 0)
          crop.offsetX = Math.max(0, Math.min(100, crop.offsetX - dx / overflow * 100))
      } else {
        const overflow = cw / imgA - ch
        if (overflow > 0)
          crop.offsetY = Math.max(0, Math.min(100, crop.offsetY - dy / overflow * 100))
      }
    }

    function onDragStart(e)  { crop.dragging = true; crop.lastX = e.clientX; crop.lastY = e.clientY }
    function onMouseMove(e)  { applyDelta(e.clientX, e.clientY) }
    function onTouchStart(e) { const t = e.touches[0]; crop.dragging = true; crop.lastX = t.clientX; crop.lastY = t.clientY }
    function onTouchMove(e)  { const t = e.touches[0]; applyDelta(t.clientX, t.clientY) }
    function onDragEnd()     { crop.dragging = false }

    // 確認裁切
    function confirmCrop() {
      const r = store.state.ratio
      const aspect = r.w / r.h
      const longSide = 1080
      const outW = aspect >= 1 ? longSide             : Math.round(longSide * aspect)
      const outH = aspect >= 1 ? Math.round(longSide / aspect) : longSide

      const canvas = document.createElement('canvas')
      canvas.width = outW; canvas.height = outH
      const ctx = canvas.getContext('2d')

      const img = crop.img
      const imgA = img.naturalWidth / img.naturalHeight
      const canA = outW / outH
      let sx, sy, sw, sh

      if (imgA > canA) {
        sh = img.naturalHeight; sw = sh * canA
        sx = (img.naturalWidth - sw) * crop.offsetX / 100; sy = 0
      } else {
        sw = img.naturalWidth; sh = sw / canA
        sx = 0; sy = (img.naturalHeight - sh) * crop.offsetY / 100
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH)

      const croppedUrl = canvas.toDataURL('image/jpeg', 0.92)
      const croppedImg = new Image()
      croppedImg.onload = () => {
        const bg = {
          id: `bg-${Date.now()}`,
          type: 'image',
          value: croppedUrl,
          image: croppedImg,
          label: crop.label
        }
        if (crop.isUpload) {
          // 上傳的圖：加入自訂清單並選取
          store.addCustomBackground(bg)
        } else {
          // 預設圖：直接設為背景（不加入清單）
          store.setBackground(bg)
        }
      }
      croppedImg.src = croppedUrl
      crop.open = false
    }

    return {
      store, frameRef, ratio, crop, isSelected,
      openPresetCrop, onUpload,
      onDragStart, onMouseMove, onTouchStart, onTouchMove, onDragEnd,
      confirmCrop
    }
  }
})
