<template>
  <section class="result-modal">
    <h2>完成！</h2>
    <div class="img-frame">
      <img v-if="store.state.capturedDataUrl" :src="store.state.capturedDataUrl" class="result-img" alt="拍攝結果" />
    </div>
    <div class="actions">
      <button class="primary-btn" @click="onDownload">下載照片</button>
      <button class="secondary-btn" @click="$emit('retake')">重新拍攝</button>
      <button class="secondary-btn" @click="$emit('restart')">重新設定</button>
    </div>
  </section>
</template>

<script setup>
import { usePhotoStore } from '../stores/photoStore.js'

defineEmits(['retake', 'restart'])
const store = usePhotoStore()

function onDownload() {
  if (!store.state.capturedDataUrl) return
  const a = document.createElement('a')
  a.href = store.state.capturedDataUrl
  a.download = `bbp-green-screen-${Date.now()}.png`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
</script>

<style scoped>
.result-modal {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}
.img-frame {
  background:
    repeating-conic-gradient(#e8e8e8 0% 25%, #ffffff 0% 50%) 50% / 24px 24px;
  border: 1px solid #d0d7de;
  border-radius: 10px;
  padding: 8px;
}
.result-img {
  max-width: 78vw;
  max-height: 60vh;
  display: block;
  border-radius: 4px;
}
.actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
}
</style>
