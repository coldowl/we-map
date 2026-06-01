import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { LazyStore } from '@tauri-apps/plugin-store'
import router from './router'
import i18n from './i18n'
import App from './App.vue'
import './utils/leaflet-icon-fix'
import './style.css'

// Apply saved theme before mount to avoid flash
const store = new LazyStore('settings.json')
store.get<{ theme?: string }>('settings').then((s) => {
  if (s?.theme) document.documentElement.dataset.theme = s.theme
})

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(i18n)
app.mount('#app')
