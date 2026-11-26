<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { t } from '@/i18n'
import { two } from '@/services/format'

const props = defineProps({ endsAt: { type: [String, Date], required: true } })
const now = ref(Date.now())
let timer
onMounted(() => (timer = setInterval(() => (now.value = Date.now()), 1000)))
onUnmounted(() => clearInterval(timer))

const left = computed(() => Math.max(0, Math.floor((new Date(props.endsAt) - now.value) / 1000)))
const parts = computed(() => [
  { v: two(Math.floor(left.value / 86400)), l: 'days' },
  { v: two(Math.floor((left.value % 86400) / 3600)), l: 'hrs' },
  { v: two(Math.floor((left.value % 3600) / 60)), l: 'min' },
  { v: two(left.value % 60), l: 'sec' },
])
</script>

<template>
  <div class="cd" role="timer">
    <template v-for="(p, i) in parts" :key="p.l">
      <div class="cd-box"><b>{{ p.v }}</b><span>{{ t(p.l) }}</span></div>
      <div v-if="i < 3" class="cd-sep"><i></i><i></i></div>
    </template>
  </div>
</template>
