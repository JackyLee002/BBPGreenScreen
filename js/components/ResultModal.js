import { defineComponent } from 'vue'
import { useStore } from '../store.js'

export default defineComponent({
  name: 'ResultModal',
  emits: ['retake', 'restart'],
  template: `
    <section class="result-view">
      <h2>完成！</h2>
      <div class="result-frame">
        <img v-if="store.state.capturedDataUrl"
             :src="store.state.capturedDataUrl"
             class="result-img"
             alt="拍攝結果" />
      </div>
      <div class="result-actions">
        <button class="btn-primary" @click="onDownload">下載照片</button>
        <button class="btn-secondary" @click="$emit('retake')">重新拍攝</button>
        <button class="btn-secondary" @click="$emit('restart')">重新設定</button>
      </div>
    </section>
  `,
  setup() {
    const store = useStore()
    function onDownload() {
      if (!store.state.capturedDataUrl) return
      const a = document.createElement('a')
      a.href = store.state.capturedDataUrl
      a.download = `bbp-${Date.now()}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
    return { store, onDownload }
  }
})
