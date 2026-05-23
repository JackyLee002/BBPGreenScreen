import { createApp, defineComponent } from 'vue'
import SetupPanel  from './components/SetupPanel.js'
import CameraStage from './components/CameraStage.js'
import ResultModal from './components/ResultModal.js'
import { useStore } from './store.js'

const App = defineComponent({
  name: 'App',
  components: { SetupPanel, CameraStage, ResultModal },
  template: `
    <div class="app">
      <header class="app-header">
        <h1>BBP 綠幕拍照</h1>
      </header>
      <main class="app-main">
        <SetupPanel  v-if="store.state.stage === 'setup'"  @next="store.setStage('camera')" />
        <CameraStage v-else-if="store.state.stage === 'camera'"
                     @back="store.setStage('setup')"
                     @captured="store.setStage('result')" />
        <ResultModal v-else-if="store.state.stage === 'result'"
                     @retake="store.setStage('camera')"
                     @restart="store.setStage('setup')" />
      </main>
    </div>
  `,
  setup() {
    return { store: useStore() }
  }
})

createApp(App).mount('#app')
