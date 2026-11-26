<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import Icon from './Icon.vue'
import { useApp } from '@/stores/app'
import { lang, LANG_LABELS } from '@/i18n'

const app = useApp()
const router = useRouter()
const open = ref(false)

function pick(l) {
  app.setLang(l)
  open.value = false
}
</script>

<template>
  <header class="flex items-center gap-2 mb-4">
    <router-link to="/" class="flex items-center gap-3 mr-auto no-underline" style="color: inherit">
      <span class="grid place-items-center w-12 h-12 rounded-full flex-none"
            style="background: linear-gradient(135deg, #f7bd33, #c98a0b); color: #1a1203">
        <Icon name="trophy" :size="24" />
      </span>
      <span class="font-display font-bold leading-tight text-[17px] gold">Getachew<br />Fikadu</span>
    </router-link>

    <span class="muted"><Icon name="globe" :size="20" /></span>

    <div class="relative">
      <button class="lang-btn" @click="open = !open" aria-haspopup="listbox" :aria-expanded="open">
        {{ LANG_LABELS[lang] }} <Icon name="down" :size="16" />
      </button>
      <div v-if="open" class="fixed inset-0 z-40" @click="open = false"></div>
      <ul v-if="open" role="listbox" class="absolute right-0 mt-2 z-50 w-44 p-1 list-none m-0 rounded-2xl"
          style="background: var(--surface); border: 1px solid var(--line); box-shadow: 0 14px 40px rgba(0,0,0,.5)">
        <li v-for="(label, code) in LANG_LABELS" :key="code">
          <button class="w-full text-left px-3 py-3 rounded-xl font-semibold bg-transparent"
                  :class="lang === code ? 'gold' : ''" @click="pick(code)">{{ label }}</button>
        </li>
      </ul>
    </div>

    <button class="icon-btn" @click="router.push('/notifications')" :aria-label="'notifications'">
      <Icon name="bell" :size="20" />
      <span v-if="app.me?.unread" class="absolute top-2 right-2 w-2.5 h-2.5 rounded-full"
            style="background: #ef4444"></span>
    </button>

    <button class="icon-btn" @click="app.toggleTheme()" aria-label="theme">
      <Icon :name="app.theme === 'dark' ? 'sun' : 'moon'" :size="20" />
    </button>
  </header>
</template>
