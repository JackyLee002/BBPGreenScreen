import { reactive } from 'vue'

export const ratios = [
  { label: '1:1',  w: 1,  h: 1,  hint: '48 × 48' },
  { label: '4:3',  w: 4,  h: 3,  hint: '64 × 48' },
  { label: '3:4',  w: 3,  h: 4,  hint: '直式' },
  { label: '16:9', w: 16, h: 9,  hint: '寬螢幕' },
  { label: '9:16', w: 9,  h: 16, hint: '手機直式' }
]

// 預設背景圖來源（點擊後進裁切 modal）
export const presetSources = [
  { id: 'bg-300', src: 'img/300.jpg', label: '背景1' }
]

const state = reactive({
  ratio: ratios[0],
  background: null,
  customBackgrounds: [],
  capturedDataUrl: null,
  stage: 'setup'
})

export function useStore() {
  return {
    state,
    ratios,
    presetSources,
    setRatio(r)  { state.ratio = r },
    setBackground(bg) { state.background = bg },
    addCustomBackground(bg) {
      state.customBackgrounds.push(bg)
      state.background = bg
    },
    setCaptured(url) { state.capturedDataUrl = url },
    setStage(s) { state.stage = s }
  }
}
