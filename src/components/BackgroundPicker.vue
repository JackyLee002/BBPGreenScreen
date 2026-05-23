<template>
  <div class="bg-picker">
    <button
      v-for="bg in allBackgrounds"
      :key="bg.id || bg.value"
      class="bg-card"
      :class="{ active: isSelected(bg) }"
      :style="bgStyle(bg)"
      @click="store.setBackground(bg)"
    >
      <span class="bg-label">{{ bg.label }}</span>
    </button>

    <label class="bg-card bg-upload">
      <input type="file" accept="image/*" @change="onUpload" hidden />
      <span class="upload-icon">+</span>
      <span class="upload-text">上傳背景</span>
    </label>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { usePhotoStore } from '../stores/photoStore.js'

const store = usePhotoStore()

const allBackgrounds = computed(() => [...store.presetBackgrounds, ...store.state.customBackgrounds])

function isSelected(bg) {
  const current = store.state.background
  if (!current) return false
  if (bg.id && current.id) return bg.id === current.id
  return current.value === bg.value
}

function bgStyle(bg) {
  if (bg.type === 'color') return { background: bg.value }
  if (bg.type === 'gradient') return { background: bg.value }
  if (bg.type === 'image') {
    return {
      backgroundImage: `url(${bg.value})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center'
    }
  }
  return {}
}

function onUpload(e) {
  const file = e.target.files && e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    const dataUrl = reader.result
    const img = new Image()
    img.onload = () => {
      store.addCustomBackground({
        id: `custom-${Date.now()}`,
        type: 'image',
        value: dataUrl,
        image: img,
        label: '自訂'
      })
    }
    img.src = dataUrl
  }
  reader.readAsDataURL(file)
  e.target.value = ''
}
</script>

<style scoped>
.bg-picker {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap: 12px;
}
.bg-card {
  aspect-ratio: 1 / 1;
  border: 2px solid #d0d7de;
  border-radius: 10px;
  background: white;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 6px;
  position: relative;
  overflow: hidden;
  font-family: inherit;
}
.bg-card:hover { border-color: #888; }
.bg-card.active {
  border-color: #2da44e;
  box-shadow: 0 0 0 3px rgba(45, 164, 78, 0.25);
}
.bg-label {
  background: rgba(0, 0, 0, 0.55);
  color: white;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  pointer-events: none;
}
.bg-upload {
  border-style: dashed;
  color: #6b7280;
  align-items: center;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
}
.upload-icon { font-size: 28px; font-weight: 300; line-height: 1; }
.upload-text { font-size: 12px; }
</style>
