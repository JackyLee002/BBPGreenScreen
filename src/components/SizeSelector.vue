<template>
  <div class="size-selector">
    <button
      v-for="r in store.ratios"
      :key="r.label"
      class="size-card"
      :class="{ active: store.state.ratio.label === r.label }"
      @click="store.setRatio(r)"
    >
      <div class="size-preview-wrap">
        <div class="size-preview" :style="previewStyle(r)"></div>
      </div>
      <div class="size-label">{{ r.label }}</div>
      <div class="size-hint">{{ r.hint }}</div>
    </button>
  </div>
</template>

<script setup>
import { usePhotoStore } from '../stores/photoStore.js'
const store = usePhotoStore()

function previewStyle(r) {
  const max = 56
  const longSide = Math.max(r.w, r.h)
  return {
    width: `${(r.w / longSide) * max}px`,
    height: `${(r.h / longSide) * max}px`
  }
}
</script>

<style scoped>
.size-selector {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.size-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 16px;
  border: 2px solid #d0d7de;
  border-radius: 10px;
  background: white;
  cursor: pointer;
  transition: all 0.15s;
  min-width: 96px;
  font-family: inherit;
}
.size-card:hover { border-color: #888; }
.size-card.active {
  border-color: #2da44e;
  background: #f0fff4;
}
.size-preview-wrap {
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.size-preview {
  background: #c0c4c9;
  border-radius: 3px;
  transition: background 0.15s;
}
.size-card.active .size-preview { background: #2da44e; }
.size-label { font-weight: 600; font-size: 15px; }
.size-hint { font-size: 12px; color: #6b7280; }
</style>
