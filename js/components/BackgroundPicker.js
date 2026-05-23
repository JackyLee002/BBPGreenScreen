import { defineComponent, computed } from 'vue'
import { useStore } from '../store.js'

export default defineComponent({
  name: 'BackgroundPicker',
  template: `
    <div class="bg-picker">
      <button
        v-for="bg in allBackgrounds"
        :key="bg.id || bg.value"
        class="bg-card"
        :class="{ active: isSelected(bg) }"
        :style="bgStyle(bg)"
        @click="store.setBackground(bg)"
      >
        <span class="bg-card-label">{{ bg.label }}</span>
      </button>

      <label class="bg-card bg-upload" title="上傳自訂背景">
        <input type="file" accept="image/*" style="display:none" @change="onUpload" />
        <span class="bg-upload-icon">+</span>
        <span class="bg-upload-text">上傳背景</span>
      </label>
    </div>
  `,
  setup() {
    const store = useStore()
    const allBackgrounds = computed(() => [
      ...store.presetBackgrounds,
      ...store.state.customBackgrounds
    ])

    function isSelected(bg) {
      const cur = store.state.background
      if (!cur) return false
      if (bg.id && cur.id) return bg.id === cur.id
      return cur.value === bg.value
    }

    function bgStyle(bg) {
      if (bg.type === 'color')    return { background: bg.value }
      if (bg.type === 'gradient') return { background: bg.value }
      if (bg.type === 'image')    return { backgroundImage: `url(${bg.value})`, backgroundSize: 'cover', backgroundPosition: 'center' }
      return {}
    }

    function onUpload(e) {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        const img = new Image()
        img.onload = () => store.addCustomBackground({
          id: `custom-${Date.now()}`,
          type: 'image',
          value: reader.result,
          image: img,
          label: '自訂'
        })
        img.src = reader.result
      }
      reader.readAsDataURL(file)
      e.target.value = ''
    }

    return { store, allBackgrounds, isSelected, bgStyle, onUpload }
  }
})
