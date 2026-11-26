<script setup>
import Icon from '@/components/Icon.vue'
import { useApp } from '@/stores/app'
import { lang, t, LANG_LABELS } from '@/i18n'
import { shareInvite } from '@/services/telegram'

const app = useApp()

function invite() {
  const link = `https://t.me/${app.me.botUsername}?start=ref_${app.me.id}`
  shareInvite(link, 'Join Getachew Fikadu Jirata Bot! 🚘')
}
</script>

<template>
  <div class="flex items-center gap-4 mt-2 mb-6">
    <span class="grid place-items-center w-16 h-16 rounded-full font-display font-bold text-[26px]"
          style="background: linear-gradient(135deg, #f7bd33, #c98a0b); color: #1a1203">
      {{ (app.me.firstName || '?')[0].toUpperCase() }}
    </span>
    <div class="min-w-0">
      <div class="font-display font-bold text-[22px] truncate">{{ app.me.firstName }}</div>
      <div class="muted text-[14px]">{{ app.me.phone }}<span v-if="app.me.username"> · @{{ app.me.username }}</span></div>
    </div>
  </div>

  <section class="card p-5">
    <h3 class="m-0 mb-3 font-display text-[16px] muted">{{ t('language') }}</h3>
    <div class="flex gap-2 flex-wrap">
      <button v-for="(label, code) in LANG_LABELS" :key="code" class="chip" :class="{ on: lang === code }"
              @click="app.setLang(code)">{{ label }}</button>
    </div>
    <h3 class="m-0 mt-5 mb-3 font-display text-[16px] muted">{{ t('theme') }}</h3>
    <div class="flex gap-2">
      <button class="chip" :class="{ on: app.theme === 'dark' }" @click="app.theme = 'dark'">
        <Icon name="moon" :size="16" /> {{ t('darkMode') }}
      </button>
      <button class="chip" :class="{ on: app.theme === 'light' }" @click="app.theme = 'light'">
        <Icon name="sun" :size="16" /> {{ t('lightMode') }}
      </button>
    </div>
  </section>

  <button v-if="app.me.botUsername" class="btn btn-ghost w-full mt-4" style="color: var(--text)" @click="invite">
    <Icon name="share" :size="20" /> {{ t('invite') }}
  </button>
  <router-link v-if="app.me.isAdmin" to="/admin" class="btn btn-gold w-full mt-3 no-underline">
    <Icon name="shield" :size="20" /> {{ t('adminPanel') }}
  </router-link>
</template>
