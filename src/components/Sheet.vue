<script setup>
import { onMounted, onUnmounted } from 'vue'
import Icon from './Icon.vue'

defineProps({
  title: String,
  subtitle: String,
  step: { type: Number, default: 0 }, // 0 = no progress bar
  steps: { type: Number, default: 3 },
})
const emit = defineEmits(['close'])

onMounted(() => (document.body.style.overflow = 'hidden'))
onUnmounted(() => (document.body.style.overflow = ''))
</script>

<template>
  <Teleport to="body">
    <Transition name="slide" appear>
      <div class="overlay" @click.self="emit('close')">
        <section class="sheet" role="dialog" aria-modal="true" :aria-label="title">
          <div class="sheet-head">
            <div>
              <h2 class="font-display font-bold text-[24px] m-0 leading-tight">{{ title }}</h2>
              <p v-if="subtitle" class="muted text-[14px] mt-1 mb-0">{{ subtitle }}</p>
            </div>
            <button class="grid place-items-center w-11 h-11 rounded-2xl flex-none"
                    style="background: var(--card); border: 1px solid var(--line); color: var(--muted)"
                    @click="emit('close')" aria-label="close">
              <Icon name="x" :size="20" />
            </button>
          </div>
          <div v-if="step" class="steps"><i v-for="n in steps" :key="n" :class="{ on: n <= step }"></i></div>
          <div class="sheet-body"><slot /></div>
          <div v-if="$slots.footer" class="sheet-foot"><slot name="footer" /></div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>
