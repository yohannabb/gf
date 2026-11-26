<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import Icon from '@/components/Icon.vue'
import FeaturedCard from '@/components/FeaturedCard.vue'
import LotteryRow from '@/components/LotteryRow.vue'
import { api } from '@/services/api'
import { t } from '@/i18n'

const router = useRouter()
const data = ref(null)
const failed = ref(false)
const filter = ref('all')

async function load() {
  failed.value = false
  try {
    data.value = await api.get('/api/home')
  } catch {
    failed.value = true
  }
}
onMounted(load)

const WEEK = 7 * 86400 * 1000
const others = computed(() => {
  const list = data.value?.others || []
  if (filter.value === 'featured') return list.filter((l) => l.featured)
  if (filter.value === 'new') return list.filter((l) => Date.now() - new Date(l.createdAt) < WEEK)
  return list
})
const chips = [
  { id: 'all', icon: '✨', key: 'all' },
  { id: 'featured', icon: '🔥', key: 'featured' },
  { id: 'new', icon: '📈', key: 'new' },
]
</script>

<template>
  <div v-if="failed" class="text-center py-16">
    <p class="muted">{{ t('errGeneric') }}</p>
    <button class="btn btn-gold btn-sm" @click="load">{{ t('retry') }}</button>
  </div>
  <div v-else-if="!data" class="flex flex-col gap-4">
    <div class="skeleton" style="height: 520px"></div>
  </div>
  <template v-else>
    <FeaturedCard v-if="data.featured" :lottery="data.featured" @buy="router.push(`/lottery/${data.featured.id}`)" />

    <div class="flex gap-3 mt-5 overflow-x-auto pb-1">
      <button v-for="c in chips" :key="c.id" class="chip" :class="{ on: filter === c.id }" @click="filter = c.id">
        <span>{{ c.icon }}</span> {{ t(c.key) }}
      </button>
    </div>

    <div class="flex justify-between items-baseline mt-6 mb-3">
      <h3 class="m-0 font-display font-bold text-[19px]">{{ t('ongoing') }}</h3>
      <span class="muted text-[14px]">{{ t('available', { n: others.length }) }}</span>
    </div>

    <div v-if="others.length" class="flex flex-col gap-3">
      <LotteryRow v-for="l in others" :key="l.id" :lottery="l" />
    </div>
    <div v-else class="text-center py-12 muted">
      <Icon name="ticket" :size="40" :stroke="1.5" />
      <p class="font-semibold mt-3 mb-1">{{ t('noOther') }}</p>
      <p class="text-[14px] m-0 px-6 opacity-80">{{ t('noOtherHint') }}</p>
    </div>
  </template>
</template>
