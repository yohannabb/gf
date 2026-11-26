import { defineStore } from 'pinia'
import { ref, watchEffect } from 'vue'
import { api } from '@/services/api'
import { lang } from '@/i18n'

export const useApp = defineStore('app', () => {
  const me = ref(null)
  const ready = ref(false)
  const authError = ref(null)
  const theme = ref(localStorage.getItem('theme') || 'dark')
  const toast = ref(null)
  let toastTimer

  watchEffect(() => {
    document.documentElement.dataset.theme = theme.value
    localStorage.setItem('theme', theme.value)
  })

  let initPromise
  function init() {
    return (initPromise ??= doInit())
  }

  async function doInit() {
    try {
      me.value = await api.get('/api/me')
      lang.value = me.value.language
    } catch (e) {
      authError.value = e.code || 'error'
    } finally {
      ready.value = true
    }
  }

  async function setLang(l) {
    lang.value = l
    if (me.value) me.value.language = l
    api.patch('/api/me', { language: l }).catch(() => {})
  }

  function toggleTheme() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
  }

  async function refreshUnread() {
    try {
      me.value = await api.get('/api/me')
    } catch {}
  }

  function showToast(text, kind = 'err') {
    toast.value = { text, kind }
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => (toast.value = null), 4200)
  }

  return { me, ready, authError, theme, toast, init, setLang, toggleTheme, refreshUnread, showToast }
})
