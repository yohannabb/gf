<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Icon from '@/components/Icon.vue'
import Countdown from '@/components/Countdown.vue'
import NumberPicker from '@/components/NumberPicker.vue'
import OrderFlow from '@/components/OrderFlow.vue'
import { api } from '@/services/api'
import { t } from '@/i18n'
import { fmt, pad4 } from '@/services/format'
import { useApp } from '@/stores/app'
import { haptic } from '@/services/telegram'

const route = useRoute()
const router = useRouter()
const app = useApp()

const data = ref(null)
const failed = ref(false)
const qty = ref(1)
const selected = ref([])
const showPicker = ref(false)
const showOrder = ref(false)

async function load() {
  failed.value = false
  try {
    data.value = await api.get(`/api/lotteries/${route.params.id}`)
  } catch {
    failed.value = true
  }
}
onMounted(load)

const l = computed(() => data.value?.lottery)
const takenSet = computed(() => new Set(data.value?.taken || []))
const freeCount = computed(() => (l.value ? l.value.totalTickets - takenSet.value.size : 0))
const open = computed(() => data.value?.open && freeCount.value > 0)
const missing = computed(() => qty.value - selected.value.length)
const canBuy = computed(() => open.value && selected.value.length > 0 && missing.value === 0)
const total = computed(() => qty.value * (l.value?.ticketPrice || 0))

function inc() {
  if (qty.value < freeCount.value) qty.value++
  haptic('light')
}
function dec() {
  if (qty.value > 1) {
    qty.value--
    selected.value = selected.value.slice(0, qty.value)
  }
  haptic('light')
}

// random free numbers (the server still checks again when the order is sent)
function quickPick() {
  const free = []
  for (let n = 1; n <= l.value.totalTickets; n++) if (!takenSet.value.has(n)) free.push(n)
  const want = Math.min(qty.value, free.length)
  const rnd = new Uint32Array(want)
  crypto.getRandomValues(rnd)
  for (let i = 0; i < want; i++) {
    const j = i + (rnd[i] % (free.length - i))
    ;[free[i], free[j]] = [free[j], free[i]]
  }
  selected.value = free.slice(0, want).sort((a, b) => a - b)
  haptic('medium')
}

function onPicked(nums) {
  selected.value = nums
  if (nums.length) qty.value = nums.length
  showPicker.value = false
}

async function onConflict(taken) {
  showOrder.value = false
  selected.value = selected.value.filter((n) => !taken.includes(n))
  app.showToast(t('numbersTaken', { n: taken.map(pad4).join(', ') }))
  await load()
}

function finished() {
  showOrder.value = false
  router.push('/tickets')
}
</script>

<template>
  <div v-if="failed" class="text-center py-16">
    <p class="muted">{{ t('errGeneric') }}</p>
    <button class="btn btn-gold btn-sm" @click="load">{{ t('retry') }}</button>
  </div>
  <div v-else-if="!data" class="skeleton" style="height: 560px"></div>

  <template v-else>
    <button class="flex items-center gap-1 bg-transparent muted font-semibold text-[16px] mb-3 p-0"
            @click="router.back()">
      <Icon name="left" :size="20" /> {{ t('back') }}
    </button>

    <!-- car card -->
    <article class="card">
      <div class="relative" style="height: 232px">
        <img :src="l.imageUrl" :alt="l.carName" class="w-full h-full object-cover" />
        <div class="absolute inset-x-0 bottom-0 h-28"
             style="background: linear-gradient(to bottom, transparent, var(--card))"></div>
        <span class="absolute top-4 left-4 px-4 py-2 rounded-full font-bold text-[15px]"
              style="background: rgba(10,16,14,.62); border: 1px solid rgba(255,255,255,.14); color: #fff; backdrop-filter: blur(6px)">
          🔥 {{ t('featured') }}
        </span>
        <span class="absolute top-4 right-4 flex items-center gap-2" aria-hidden="true">
          <span class="gold text-[20px]" style="letter-spacing: 2px">★★★★★</span>
          <b class="muted text-[16px]">5.0</b>
        </span>
      </div>
      <div class="px-5 pb-5">
        <h2 class="font-display font-bold m-0 leading-tight" style="font-size: 34px">{{ l.carName }}</h2>
        <div class="font-bold text-[18px] mt-1" style="color: var(--green)">{{ l.carColor }}</div>
        <div class="muted font-semibold mt-6 mb-3 text-[15px]">🔥 {{ t('timeRemaining') }}</div>
        <Countdown :ends-at="l.endsAt" />
      </div>
    </article>

    <!-- price + quantity -->
    <div class="flex items-center justify-between mt-6">
      <div>
        <div class="muted font-semibold text-[15px]">{{ t('ticketPrice') }}</div>
        <div class="font-display font-bold gold" style="font-size: 30px">{{ fmt(l.ticketPrice) }} {{ t('birr') }}</div>
      </div>
      <div class="flex items-center gap-4 rounded-full p-2" style="background: var(--surface); border: 1px solid var(--line)">
        <button class="grid place-items-center w-11 h-11 rounded-full" style="background: var(--card); color: var(--text)"
                :disabled="qty <= 1" @click="dec" aria-label="-"><Icon name="minus" :size="18" /></button>
        <b class="font-display text-[20px] min-w-6 text-center">{{ qty }}</b>
        <button class="grid place-items-center w-11 h-11 rounded-full" style="background: var(--gold); color: #1a1203"
                :disabled="qty >= freeCount" @click="inc" aria-label="+"><Icon name="plus" :size="18" /></button>
      </div>
    </div>

    <div v-if="selected.length" class="flex items-center flex-wrap gap-2 mt-5">
      <span class="muted font-semibold text-[15px]">{{ t('selectedNumbers') }}</span>
      <span v-for="n in selected" :key="n" class="num-chip">{{ pad4(n) }}</span>
    </div>

    <button class="btn w-full mt-5 glow-gold gold text-[18px]" style="padding-top: 22px; padding-bottom: 22px"
            :disabled="!open" @click="showPicker = true">
      🎯 {{ t('luckyBtn') }}
    </button>

    <div class="flex gap-3 mt-4">
      <button class="btn btn-gold flex-1 text-[18px]" :disabled="!open" @click="quickPick">
        <Icon name="zap" :size="20" /> {{ t('quickPick') }}
      </button>
      <button class="btn flex-1 text-[18px]" :class="canBuy ? 'btn-green' : 'btn-grey'" :disabled="!canBuy"
              @click="showOrder = true">
        {{ open ? t('buyTicket') : freeCount === 0 ? t('soldOut') : t('ended') }}
      </button>
    </div>
    <p v-if="open && selected.length && missing > 0" class="muted text-[14px] text-center mt-3 mb-0">
      {{ t('pickMore', { n: missing }) }}
    </p>

    <NumberPicker v-if="showPicker" :total="l.totalTickets" :taken="data.taken" :selected="selected"
                  :price="l.ticketPrice" @close="showPicker = false" @done="onPicked" />
    <OrderFlow v-if="showOrder" :lottery="l" :numbers="selected" @close="showOrder = false"
               @conflict="onConflict" @finished="finished" />
  </template>
</template>
