import { defineComponent, computed } from 'vue'
import SizeSelector from './SizeSelector.js'
import BackgroundPicker from './BackgroundPicker.js'
import { useStore } from '../store.js'

export default defineComponent({
  name: 'SetupPanel',
  components: { SizeSelector, BackgroundPicker },
  emits: ['next'],
  template: `
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

      <div class="setup-actions">
        <button class="btn-primary" :disabled="!canProceed" @click="$emit('next')">
          開始拍照 →
        </button>
      </div>
    </section>
  `,
  setup() {
    const store = useStore()
    const canProceed = computed(() => !!store.state.ratio && !!store.state.background)
    return { canProceed }
  }
})
