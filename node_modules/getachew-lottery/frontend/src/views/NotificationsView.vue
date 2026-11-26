<script setup>
import { onMounted, ref } from 'vue'
import Icon from '@/components/Icon.vue'
import { api } from '@/services/api'
import { t } from '@/i18n'
import { timeAgo } from '@/services/format'
import { useApp } from '@/stores/app'

const app = useApp()
const items = ref(null)

onMounted(async () => {
  try {
    items.value = await api.get('/api/notifications')
    if (items.value.some((n) => !n.read)) {
      await api.post('/api/notifications/read') // list keeps its "new" look for this visit
      app.refreshUnread()
    }
  } catch {
    items.value = []
  }
})
</script>

<template>
  <h1 class="font-display font-bold text-[26px] mt-2 mb-4">{{ t('notifications') }}</h1>
  <div v-if="!items" class="skeleton" style="height: 160px"></div>
  <div v-else-if="!items.length" class="text-center py-14 muted">
    <Icon name="bell" :size="40" :stroke="1.5" />
    <p class="font-semibold mt-3">{{ t('noNotif') }}</p>
  </div>
  <div v-else class="flex flex-col gap-3">
    <article v-for="n in items" :key="n.id" class="card p-4"
             :style="!n.read ? { borderColor: 'var(--gold-line)', background: 'rgba(246,185,44,.06)' } : {}">
      <div class="flex justify-between gap-3">
        <b>{{ n.title }}</b><span class="muted text-[13px] flex-none">{{ timeAgo(n.createdAt) }}</span>
      </div>
      <p class="muted m-0 mt-1 text-[14px] leading-relaxed">{{ n.body }}</p>
    </article>
  </div>
</template>
