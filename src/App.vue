<template>
  <div class="app">
    <header class="app-header">
      <h1>BBP 綠幕拍照 🎬</h1>
    </header>

    <main class="app-main">
      <SetupPanel
        v-if="store.state.stage === 'setup'"
        @next="goCamera"
      />
      <CameraStage
        v-else-if="store.state.stage === 'camera'"
        @back="goSetup"
        @captured="goResult"
      />
      <ResultModal
        v-else-if="store.state.stage === 'result'"
        @retake="goCamera"
        @restart="goSetup"
      />
    </main>
  </div>
</template>

<script setup>
import SetupPanel from './components/SetupPanel.vue'
import CameraStage from './components/CameraStage.vue'
import ResultModal from './components/ResultModal.vue'
import { usePhotoStore } from './stores/photoStore.js'

const store = usePhotoStore()

function goSetup() { store.setStage('setup') }
function goCamera() { store.setStage('camera') }
function goResult() { store.setStage('result') }
</script>
