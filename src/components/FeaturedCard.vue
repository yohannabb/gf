<script setup>
import { asset } from '@/services/api'
import { computed } from 'vue'
import Icon from './Icon.vue'
import Countdown from './Countdown.vue'
import { t } from '@/i18n'
import { fmt } from '@/services/format'

const props = defineProps({ lottery: { type: Object, required: true } })
const emit = defineEmits(['buy'])
const l = computed(() => props.lottery)
const over = computed(() => l.value.remaining === 0)
</script>

<template>
  <article class="card">
    <div class="relative" style="height: 232px">
      <img :src="asset(l.imageUrl)" :alt="l.carName" class="w-full h-full object-cover" />
      <div class="absolute inset-x-0 bottom-0 h-28"
           style="background: linear-gradient(to bottom, transparent, var(--card))"></div>
      <span class="absolute top-4 left-4 px-4 py-2 rounded-full font-bold text-[15px]"
            style="background: rgba(10,16,14,.62); border: 1px solid rgba(255,255,255,.14); color: #fff; backdrop-filter: blur(6px)">
        🔥 {{ t('featured') }}
      </span>
      <span class="absolute top-4 right-4 gold text-[20px]" style="letter-spacing: 2px" aria-hidden="true">★★★★★</span>
    </div>

    <div class="px-5 pb-5">
      <h2 class="font-display font-bold m-0 leading-tight" style="font-size: 34px">{{ l.carName }}</h2>
      <div class="font-bold text-[18px] mt-1" style="color: var(--green)">{{ l.carColor }}</div>

      <div class="muted font-semibold mt-6 mb-3 text-[15px]">⏱ {{ t('timeRemaining') }}</div>
      <Countdown :ends-at="l.endsAt" />

      <div class="flex justify-between items-baseline mt-6 text-[17px]">
        <span><b>{{ fmt(l.sold) }}</b> <span class="muted">{{ t('sold') }}</span></span>
        <b style="color: var(--green)">{{ t('filled', { n: l.percent }) }}</b>
      </div>
      <div class="bar mt-3"><i :style="{ width: l.percent + '%' }"></i></div>
      <div class="muted text-[14px] mt-3">{{ t('remaining', { n: fmt(l.remaining) }) }}</div>

      <div class="flex items-center gap-3 mt-5">
        <div class="flex items-center gap-3 flex-none">
          <span class="grid place-items-center w-12 h-12 rounded-2xl muted" style="background: var(--well)">
            <Icon name="users" :size="24" />
          </span>
          <div>
            <div class="muted text-[13px]">{{ t('participants') }}</div>
            <div class="font-bold text-[19px]">{{ fmt(l.sold) }}</div>
          </div>
        </div>
        <button class="btn flex-1 font-display text-[22px]" :class="over ? 'btn-grey' : 'btn-gold'"
                :disabled="over" @click="emit('buy')" style="padding-top: 18px; padding-bottom: 18px">
          {{ over ? t('soldOut') : t('buyTicket') }}
        </button>
      </div>
    </div>
  </article>
</template>
