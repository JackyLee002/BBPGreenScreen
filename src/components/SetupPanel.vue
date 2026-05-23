<template>
  <section class="setup-panel">
    <h2>拍照前設定</h2>

    <div class="setup-section">
      <h3>1. 選擇照片比例</h3>
      <SizeSelector />
    </div>

    <div class="setup-section">
      <h3>2. 選擇背景</h3>
      <BackgroundPicker />
    </div>

    <div class="actions">
      <button class="primary-btn" :disabled="!canProceed" @click="$emit('next')">
        開始拍照 →
      </button>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import SizeSelector from './SizeSelector.vue'
import BackgroundPicker from './BackgroundPicker.vue'
import { usePhotoStore } from '../stores/photoStore.js'

defineEmits(['next'])

const store = usePhotoStore()
const canProceed = computed(() => !!store.state.ratio && !!store.state.background)
</script>

<style scoped>
.setup-panel { display: flex; flex-direction: column; }
.actions { margin-top: 16px; }
</style>
