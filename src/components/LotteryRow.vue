<script setup>
import { computed } from 'vue'
import { t } from '@/i18n'
import { fmt } from '@/services/format'

const props = defineProps({ lottery: { type: Object, required: true } })
const l = computed(() => props.lottery)
const left = computed(() => {
  const s = Math.max(0, Math.floor((new Date(l.value.endsAt) - Date.now()) / 1000))
  return `${Math.floor(s / 86400)}${t('days')[0].toLowerCase()} ${Math.floor((s % 86400) / 3600)}${t('hrs')[0].toLowerCase()}`
})
</script>

<template>
  <router-link :to="`/lottery/${l.id}`" class="card flex gap-3 p-3 no-underline" style="color: inherit">
    <img :src="l.imageUrl" :alt="l.carName" class="w-24 h-24 rounded-2xl object-cover flex-none" />
    <div class="min-w-0 flex-1 flex flex-col">
      <div class="font-display font-bold text-[18px] truncate">{{ l.carName }}</div>
      <div class="text-[13px] font-semibold" style="color: var(--green)">{{ l.carColor }}</div>
      <div class="bar mt-auto"><i :style="{ width: l.percent + '%' }"></i></div>
      <div class="flex justify-between text-[13px] mt-1.5">
        <span class="muted">{{ fmt(l.sold) }} {{ t('sold') }} · ⏱ {{ left }}</span>
        <b class="gold">{{ fmt(l.ticketPrice) }} {{ t('birr') }}</b>
      </div>
    </div>
  </router-link>
</template>
