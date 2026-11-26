<script setup>
import { onMounted, ref } from 'vue'
import Icon from '@/components/Icon.vue'
import { api } from '@/services/api'
import { t } from '@/i18n'
import { fmt, pad4 } from '@/services/format'

const orders = ref(null)
const failed = ref(false)
onMounted(async () => {
  try {
    orders.value = await api.get('/api/orders/mine')
  } catch {
    failed.value = true
  }
})
const statusKey = { PENDING: 'pending', APPROVED: 'approved', REJECTED: 'rejected' }
const statusColor = { PENDING: 'var(--gold)', APPROVED: 'var(--green)', REJECTED: 'var(--red)' }
const date = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
</script>

<template>
  <h1 class="font-display font-bold text-[26px] mt-2 mb-4">{{ t('myTickets') }}</h1>
  <p v-if="failed" class="muted text-center py-10">{{ t('errGeneric') }}</p>
  <div v-else-if="!orders" class="skeleton" style="height: 200px"></div>
  <div v-else-if="!orders.length" class="text-center py-14 muted">
    <Icon name="ticket" :size="40" :stroke="1.5" />
    <p class="font-semibold mt-3 mb-1">{{ t('noOrders') }}</p>
    <p class="text-[14px] m-0">{{ t('noOrdersHint') }}</p>
  </div>
  <div v-else class="flex flex-col gap-3">
    <article v-for="o in orders" :key="o.code" class="card p-4">
      <div class="flex items-center gap-3">
        <img :src="o.lottery?.imageUrl" alt="" class="w-14 h-14 rounded-2xl object-cover flex-none" />
        <div class="min-w-0 flex-1">
          <div class="font-display font-bold text-[17px] truncate">{{ o.lottery?.carName }}</div>
          <div class="muted text-[13px] truncate">#{{ o.code }} · {{ date(o.createdAt) }}</div>
        </div>
        <span class="text-[13px] font-bold px-3 py-1.5 rounded-full flex-none"
              :style="{ color: statusColor[o.status], border: '1px solid ' + statusColor[o.status] }">
          {{ t(statusKey[o.status]) }}
        </span>
      </div>
      <div class="flex flex-wrap gap-2 mt-3">
        <span v-for="n in o.numbers" :key="n" class="num-chip">
          {{ o.lottery?.winnerNumber === n ? '🏆 ' : '' }}{{ pad4(n) }}
        </span>
        <span v-if="o.status === 'REJECTED'" class="muted text-[13px]">—</span>
      </div>
      <div class="flex justify-between mt-3 text-[15px]">
        <span class="muted">{{ o.bank || '' }}</span>
        <b class="gold">{{ fmt(o.total) }} {{ t('birr') }}</b>
      </div>
      <p v-if="o.rejectReason" class="m-0 mt-2 text-[14px]" style="color: var(--taken-text)">
        {{ t('reason') }}: {{ o.rejectReason }}
      </p>
    </article>
  </div>
</template>
