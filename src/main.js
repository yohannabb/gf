import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from './router'
import { initTelegram } from './services/telegram'

initTelegram()
createApp(App).use(createPinia()).use(router).mount('#app')
