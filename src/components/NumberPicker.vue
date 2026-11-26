<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import Sheet from './Sheet.vue'
import { t } from '@/i18n'
import { fmt, pad4 } from '@/services/format'
import { haptic } from '@/services/telegram'

const props = defineProps({
  total: { type: Number, required: true },
  taken: { type: Array, required: true },
  selected: { type: Array, required: true },
  price: { type: Number, required: true },
})
const emit = defineEmits(['close', 'done'])

const takenSet = computed(() => new Set(props.taken))
const sel = ref(new Set(props.selected))
const visible = ref(700) // the grid is drawn in chunks so 4,000 numbers stay fast
const nums = computed(() => Array.from({ length: Math.min(visible.value, props.total) }, (_, i) => i + 1))

function toggle(n) {
  if (takenSet.value.has(n)) return
  const s = new Set(sel.value)
  s.has(n) ? s.delete(n) : s.add(n)
  sel.value = s
  haptic('light')
}
const cls = (n) => (takenSet.value.has(n) ? 'taken' : sel.value.has(n) ? 'sel' : 'free')

const sentinel = ref(null)
let io
watch(
  sentinel,
  (el) => {
    if (!el) return
    io = new IntersectionObserver(
      (e) => e[0].isIntersecting && visible.value < props.total && (visible.value += 700),
      { rootMargin: '600px' }
    )
    io.observe(el)
  },
  { flush: 'post' }
)
onBeforeUnmount(() => io?.disconnect())

const done = () => emit('done', [...sel.value].sort((a, b) => a - b))
</script>

<template>
  <Sheet :title="t('luckyTitle')" :subtitle="t('nSelected', { n: sel.size })" @close="emit('close')">
    <div class="legend sticky top-0 py-2 z-10" style="background: var(--surface)">
      <span><i style="background: var(--gold)"></i>{{ t('legendSelected') }}</span>
      <span><i style="background: var(--red)"></i>{{ t('legendTaken') }}</span>
      <span><i style="background: #000; border: 1px solid #444"></i>{{ t('legendFree') }}</span>
    </div>
    <div class="grid7 mt-2">
      <button v-for="n in nums" :key="n" class="cell" :class="cls(n)" :disabled="takenSet.has(n)"
              :aria-pressed="sel.has(n)" :aria-label="pad4(n)" @click="toggle(n)">
        {{ pad4(n) }}
      </button>
    </div>
    <div ref="sentinel" style="height: 1px"></div>

    <template #footer>
      <div class="flex justify-between items-center mb-3 text-[15px]">
        <span class="muted">{{ sel.size }} × {{ fmt(price) }} {{ t('birr') }}</span>
        <b>{{ fmt(sel.size * price) }} {{ t('birr') }}</b>
      </div>
      <button class="btn btn-green w-full font-display text-[22px]" style="padding: 18px" @click="done">
        {{ t('done') }}
      </button>
    </template>
  </Sheet>
</template>
