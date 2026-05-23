import { reactive } from 'vue'

const ratios = [
  { label: '1:1',  w: 1,  h: 1,  hint: '48 × 48' },
  { label: '4:3',  w: 4,  h: 3,  hint: '64 × 48' },
  { label: '3:4',  w: 3,  h: 4,  hint: '直式' },
  { label: '16:9', w: 16, h: 9,  hint: '寬螢幕' },
  { label: '9:16', w: 9,  h: 16, hint: '手機直式' }
]

const presetBackgrounds = [
  { id: 'white',  type: 'color', value: '#ffffff', label: '純白' },
  { id: 'black',  type: 'color', value: '#111111', label: '純黑' },
  { id: 'pink',   type: 'color', value: '#f4c2c2', label: '粉紅' },
  { id: 'sky',    type: 'color', value: '#a8d8ea', label: '天藍' },
  { id: 'sunset', type: 'gradient', value: 'linear-gradient(135deg, #ffb88c, #de6262)', label: '夕陽' },
  { id: 'ocean',  type: 'gradient', value: 'linear-gradient(180deg, #43cea2, #185a9d)', label: '海洋' }
]

const state = reactive({
  ratio: ratios[0],
  background: presetBackgrounds[0],
  customBackgrounds: [],
  capturedDataUrl: null,
  stage: 'setup'
})

export function usePhotoStore() {
  return {
    state,
    ratios,
    presetBackgrounds,
    setRatio(r) { state.ratio = r },
    setBackground(bg) { state.background = bg },
    addCustomBackground(bg) {
      state.customBackgrounds.push(bg)
      state.background = bg
    },
    setCaptured(url) { state.capturedDataUrl = url },
    setStage(s) { state.stage = s }
  }
}
