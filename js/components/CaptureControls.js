import { defineComponent } from 'vue'

export default defineComponent({
  name: 'CaptureControls',
  props: {
    params: { type: Object, required: true },
    ready:  { type: Boolean, default: true }
  },
  emits: ['capture'],
  template: `
    <div class="capture-controls">
      <details class="capture-advanced">
        <summary>進階去背參數</summary>
        <div class="capture-params">
          <label class="capture-param-label">
            <span>敏感度（內閾值）<b class="capture-param-val">{{ params.inner.toFixed(2) }}</b></span>
            <input type="range" min="0" max="0.4" step="0.01" :value="params.inner"
              @input="params.inner = parseFloat($event.target.value)" />
          </label>
          <label class="capture-param-label">
            <span>邊緣柔化（外閾值）<b class="capture-param-val">{{ params.outer.toFixed(2) }}</b></span>
            <input type="range" min="0" max="0.5" step="0.01" :value="params.outer"
              @input="params.outer = parseFloat($event.target.value)" />
          </label>
          <label class="capture-param-label">
            <span>去綠光暈 <b class="capture-param-val">{{ params.despill.toFixed(2) }}</b></span>
            <input type="range" min="0" max="1" step="0.05" :value="params.despill"
              @input="params.despill = parseFloat($event.target.value)" />
          </label>
        </div>
      </details>

      <button class="capture-shutter" :disabled="!ready" @click="$emit('capture')" aria-label="拍照">
        <span class="capture-shutter-dot"></span>
      </button>

      <p class="capture-tip">小提示：固定照明、距離綠幕約一臂以上、避免穿綠色衣物</p>
    </div>
  `
})
