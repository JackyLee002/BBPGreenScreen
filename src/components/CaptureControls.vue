<template>
  <div class="capture-controls">
    <details class="advanced">
      <summary>進階去背參數</summary>
      <div class="params">
        <label>
          <span>敏感度（內閾值）<small>{{ params.innerThreshold.toFixed(2) }}</small></span>
          <input type="range" min="0" max="0.4" step="0.01" v-model.number="params.innerThreshold" />
        </label>
        <label>
          <span>邊緣柔化（外閾值）<small>{{ params.outerThreshold.toFixed(2) }}</small></span>
          <input type="range" min="0" max="0.5" step="0.01" v-model.number="params.outerThreshold" />
        </label>
        <label>
          <span>去綠光暈 <small>{{ params.despillFactor.toFixed(2) }}</small></span>
          <input type="range" min="0" max="1" step="0.05" v-model.number="params.despillFactor" />
        </label>
      </div>
    </details>

    <button class="capture-btn" :disabled="!ready" @click="$emit('capture')" aria-label="拍照">
      <span class="dot"></span>
    </button>

    <p class="tip">小提示：固定照明、距離綠幕約一臂以上、避免穿綠色衣物</p>
  </div>
</template>

<script setup>
defineProps({
  params: { type: Object, required: true },
  ready: { type: Boolean, default: true }
})
defineEmits(['capture'])
</script>

<style scoped>
.capture-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: 100%;
}
.advanced {
  width: 100%;
  max-width: 480px;
  background: #f7f8fa;
  border-radius: 8px;
  padding: 8px 14px;
}
.advanced summary {
  cursor: pointer;
  user-select: none;
  font-size: 14px;
  color: #555;
  padding: 4px 0;
}
.params {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
}
.params label {
  font-size: 13px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.params small {
  color: #2da44e;
  margin-left: 6px;
  font-weight: 600;
}
.params input[type="range"] {
  width: 100%;
  accent-color: #2da44e;
}
.capture-btn {
  width: 76px;
  height: 76px;
  border-radius: 50%;
  background: white;
  border: 4px solid #222;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.1s;
  padding: 0;
}
.capture-btn:hover:not(:disabled) { transform: scale(1.05); }
.capture-btn:active:not(:disabled) { transform: scale(0.93); }
.capture-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.dot {
  width: 58px;
  height: 58px;
  border-radius: 50%;
  background: #e63946;
}
.tip { color: #6b7280; font-size: 12px; margin: 0; }
</style>
