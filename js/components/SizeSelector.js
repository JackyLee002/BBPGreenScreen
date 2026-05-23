import { defineComponent } from 'vue'
import { useStore } from '../store.js'

export default defineComponent({
  name: 'SizeSelector',
  template: `
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
        <div class="size-card-label">{{ r.label }}</div>
        <div class="size-card-hint">{{ r.hint }}</div>
      </button>
    </div>
  `,
  setup() {
    const store = useStore()
    function previewStyle(r) {
      const max = 52
      const long = Math.max(r.w, r.h)
      return { width: `${(r.w / long) * max}px`, height: `${(r.h / long) * max}px` }
    }
    return { store, previewStyle }
  }
})
