<script setup>
import { onMounted } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import BottomNav from '@/components/BottomNav.vue'
import { useApp } from '@/stores/app'
import { t } from '@/i18n'

const app = useApp()
onMounted(app.init)
</script>

<template>
  <div v-if="!app.ready" class="shell">
    <div class="skeleton mb-4" style="height: 56px"></div>
    <div class="skeleton" style="height: 520px"></div>
  </div>

  <div v-else-if="app.authError" class="shell text-center" style="padding-top: 90px">
    <div class="text-[64px]">🚘</div>
    <h1 class="font-display font-bold text-[24px] mt-4">Getachew Fikadu</h1>
    <p class="muted leading-relaxed px-4">
      <template v-if="app.authError === 'network'">{{ t('errNetwork') }}</template>
      <template v-else>{{ t('openInBot') }}</template>
    </p>
  </div>

  <template v-else>
    <div class="shell">
      <AppHeader />
      <router-view />
    </div>
    <BottomNav />
  </template>

  <div v-if="app.toast" class="toast" :class="app.toast.kind" role="status">{{ app.toast.text }}</div>
</template>
