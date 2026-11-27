<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import Sheet from './Sheet.vue'
import Icon from './Icon.vue'
import { api, ApiError } from '@/services/api'
import { t } from '@/i18n'
import { fmt } from '@/services/format'
import { useApp } from '@/stores/app'

const props = defineProps({
  lottery: { type: Object, required: true },
  numbers: { type: Array, required: true },
})
const emit = defineEmits(['close', 'conflict', 'finished'])
const app = useApp()

const step = ref(1) // 1 confirm, 2 payment, 3 review, 4 sent
const fullName = ref('')
const banks = ref([])
const bankId = ref(null)
const file = ref(null)
const preview = ref(null)
const sender = ref('')
const err = ref('')
const busy = ref(false)
const code = ref('')
const input = ref(null)

const total = computed(() => props.numbers.length * props.lottery.ticketPrice)
const bank = computed(() => banks.value.find((b) => b.id === bankId.value))
const heading = computed(
  () => ({ 1: t('confirmTitle'), 2: t('payment'), 3: t('reviewTitle'), 4: t('submittedTitle') })[step.value]
)

onMounted(async () => {
  try {
    banks.value = await api.get('/api/banks')
  } catch {}
})
onBeforeUnmount(() => preview.value && URL.revokeObjectURL(preview.value))

function next() {
  err.value = ''
  if (step.value === 1) {
    if (fullName.value.trim().length < 2) return (err.value = t('errName'))
  }
  if (step.value === 2 && !file.value) return (err.value = t('errReceipt'))
  step.value++
}
function back() {
  err.value = ''
  step.value--
}

function onFile(e) {
  err.value = ''
  const f = e.target.files?.[0]
  e.target.value = ''
  if (!f) return
  if (!['image/png', 'image/jpeg'].includes(f.type)) return (err.value = t('errImage'))
  if (f.size > 10 * 1024 * 1024) return (err.value = t('errTooLarge'))
  if (preview.value) URL.revokeObjectURL(preview.value)
  file.value = f
  preview.value = URL.createObjectURL(f)
}

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    ta.remove()
  }
  app.showToast(t('copied'), 'ok')
}

async function submit() {
  if (busy.value) return
  busy.value = true
  err.value = ''
  try {
    const f = new FormData()
    f.append('lotteryId', props.lottery.id)
    f.append('fullName', fullName.value.trim())
    f.append('numbers', JSON.stringify(props.numbers))
    f.append('bankId', bankId.value || '')
    f.append('senderAccount', sender.value.trim())
    f.append('receipt', file.value)
    const res = await api.post('/api/orders', f)
    code.value = res.code
    step.value = 4
  } catch (e) {
    if (e instanceof ApiError && e.code === 'numbers_taken') {
      emit('conflict', e.data.taken || [])
      return
    }
    const map = {
      network: 'errNetwork',
      file_too_large: 'errTooLarge',
      invalid_image: 'errImage',
      bad_name: 'errName',
      receipt_required: 'errReceipt',
      lottery_closed: 'lotteryClosed',
    }
    err.value = t(map[e.code] || 'errGeneric')
  } finally {
    busy.value = false
  }
}

const close = () => (step.value === 4 ? emit('finished') : emit('close'))
</script>

<template>
  <Sheet :title="heading" :subtitle="t('stepOf', { a: Math.min(step, 3), b: 3 })" :step="step === 4 ? 3 : step" @close="close">
    <!-- STEP 1 -->
    <div v-if="step === 1">
      <div class="rounded-3xl p-5" style="background: var(--card); border: 1px solid var(--line)">
        <div class="font-display font-bold text-[20px]">{{ lottery.title }}</div>
        <div class="muted mt-1">{{ t('ticketsTimes', { n: numbers.length, p: fmt(lottery.ticketPrice) }) }}</div>
        <div class="font-display font-bold gold mt-4" style="font-size: 30px">{{ fmt(total) }} {{ t('birr') }}</div>
        <div class="flex flex-wrap gap-2 mt-3">
          <span v-for="n in numbers" :key="n" class="num-chip">#{{ n }}</span>
        </div>
      </div>

      <label class="label mt-6">{{ t('fullName') }}</label>
      <div class="ibox">
        <Icon name="user" :size="20" />
        <input v-model="fullName" type="text" maxlength="80" autocomplete="name" :placeholder="t('enterFullName')" />
      </div>

      <label class="label mt-5">{{ t('phoneNumber') }}</label>
      <div class="ibox locked">
        <Icon name="phone" :size="20" />
        <input :value="app.me?.phone" type="text" readonly aria-readonly="true" style="color: var(--text)" />
      </div>
    </div>

    <!-- STEP 2 -->
    <div v-else-if="step === 2">
      <p class="muted font-semibold text-[14px] mt-0">{{ t('selectBank') }}</p>
      <div class="flex flex-col gap-3">
        <div v-for="b in banks" :key="b.id" role="button" tabindex="0" class="p-4 rounded-3xl"
             :style="{ background: 'var(--card)', border: '1px solid ' + (bankId === b.id ? 'var(--gold)' : 'var(--line)') }"
             @click="bankId = bankId === b.id ? null : b.id" @keydown.enter="bankId = bankId === b.id ? null : b.id">
          <div class="flex items-center gap-3">
            <span class="grid place-items-center w-12 h-12 rounded-2xl flex-none"
                  style="background: var(--well); color: #2dd4bf"><Icon name="building" :size="24" /></span>
            <div class="min-w-0 flex-1">
              <div class="font-bold text-[18px] leading-tight">{{ b.bankName }}</div>
              <div class="muted text-[13px] mt-0.5">{{ b.accountName }}</div>
            </div>
            <span v-if="bankId === b.id" class="gold flex-none"><Icon name="check" :size="22" :stroke="3" /></span>
          </div>
          <div class="flex items-center justify-between gap-3 mt-3 pt-3" style="border-top: 1px solid var(--line)">
            <div class="min-w-0">
              <div class="muted text-[12px]">{{ t('accountNumber') }}</div>
              <b class="font-display text-[22px] select-all break-all" style="letter-spacing: .04em">{{ b.accountNumber }}</b>
            </div>
            <button class="btn-sm btn flex-none" style="background: var(--well); color: var(--text); gap: 6px"
                    @click.stop="copy(b.accountNumber)">
              <Icon name="copy" :size="16" /> {{ t('copy') }}
            </button>
          </div>
        </div>
      </div>

      <button class="w-full mt-5 rounded-3xl py-9 flex flex-col items-center gap-2 text-center overflow-hidden"
              style="background: rgba(246,185,44,.07); border: 2px dashed var(--gold-line); color: var(--muted)"
              @click="input.click()">
        <img v-if="preview" :src="preview" alt="receipt" class="max-h-48 rounded-2xl" />
        <template v-else>
          <span class="grid place-items-center w-14 h-14 rounded-2xl gold" style="background: rgba(246,185,44,.16)">
            <Icon name="upload" :size="26" />
          </span>
          <b class="text-[16px]">{{ t('uploadReceipt') }}</b>
          <span class="text-[13px]">{{ t('receiptHint') }}</span>
        </template>
      </button>
      <input ref="input" type="file" accept="image/png,image/jpeg" hidden @change="onFile" />

      <label class="label mt-5">{{ t('sentFrom') }}</label>
      <div class="ibox">
        <input v-model="sender" type="text" inputmode="numeric" maxlength="40" :placeholder="t('sentFromHint')" />
      </div>
    </div>

    <!-- STEP 3 -->
    <div v-else-if="step === 3">
      <div class="rounded-3xl p-5" style="background: var(--card); border: 1px solid var(--line)">
        <div class="font-display font-bold text-[18px] mb-3">{{ t('orderSummary') }}</div>
        <dl class="m-0 grid gap-3 text-[15px]" style="grid-template-columns: auto 1fr">
          <dt class="muted">{{ t('item') }}</dt><dd class="m-0 text-right font-bold">{{ lottery.title }}</dd>
          <dt class="muted">{{ t('tickets') }}</dt>
          <dd class="m-0 text-right font-bold">{{ numbers.length }} × {{ fmt(lottery.ticketPrice) }} {{ t('birr') }}</dd>
          <dt class="muted col-span-2">{{ t('ticketNumbers') }}</dt>
          <dd class="m-0 col-span-2 flex flex-wrap gap-2"><span v-for="n in numbers" :key="n" class="num-chip">#{{ n }}</span></dd>
          <dt class="muted">{{ t('fullName') }}</dt><dd class="m-0 text-right font-bold break-words">{{ fullName.trim() }}</dd>
          <dt class="muted">{{ t('phoneNumber') }}</dt><dd class="m-0 text-right font-bold">{{ app.me?.phone }}</dd>
          <dt class="muted">{{ t('bank') }}</dt><dd class="m-0 text-right font-bold">{{ bank?.bankName || '' }}</dd>
          <dt class="muted">{{ t('sentFrom') }}</dt><dd class="m-0 text-right font-bold break-all">{{ sender.trim() }}</dd>
        </dl>
        <div class="flex justify-between items-center mt-4 pt-4" style="border-top: 1px solid var(--line)">
          <span class="muted text-[17px]">{{ t('total') }}</span>
          <b class="font-display gold" style="font-size: 26px">{{ fmt(total) }} {{ t('birr') }}</b>
        </div>
      </div>

      <p class="muted font-semibold text-[14px] mt-6 mb-2">{{ t('uploadReceipt') }}</p>
      <img :src="preview" alt="receipt" class="w-full rounded-3xl object-cover"
           style="max-height: 220px; border: 2px solid var(--green)" />

      <div class="warn mt-4"><Icon name="alert" :size="20" class="flex-none" /> {{ t('reviewNotice') }}</div>
    </div>

    <!-- SENT -->
    <div v-else class="text-center py-8">
      <span class="inline-grid place-items-center rounded-full"
            style="width: 104px; height: 104px; background: linear-gradient(135deg, #34d399, #059669); color: #fff; box-shadow: 0 0 50px rgba(52,211,153,.35)">
        <Icon name="check" :size="54" :stroke="3" />
      </span>
      <h3 class="font-display font-bold text-[26px] mt-6 mb-2">{{ t('orderSent') }}</h3>
      <p class="muted m-0 px-4 leading-relaxed">{{ t('orderSentText', { code }) }}</p>
    </div>

    <template #footer>
      <p v-if="err" role="alert" class="m-0 mb-3 text-[14px] font-semibold" style="color: #ff8a92">{{ err }}</p>
      <button v-if="step === 1" class="btn btn-gold w-full text-[18px]" @click="next">
        {{ t('continue') }} <Icon name="right" :size="20" />
      </button>
      <div v-else-if="step === 2 || step === 3" class="flex gap-3">
        <button class="btn btn-ghost" style="flex: 1" @click="back">{{ t('back') }}</button>
        <button v-if="step === 2" class="btn btn-gold text-[18px]" style="flex: 1.4" @click="next">
          {{ t('continue') }} <Icon name="right" :size="20" />
        </button>
        <button v-else class="btn btn-gold text-[18px]" style="flex: 1.4" :disabled="busy" @click="submit">
          {{ busy ? t('loading') : t('submitOrder') }}
        </button>
      </div>
      <div v-else class="text-center">
        <button class="btn btn-lime px-14" @click="emit('finished')">{{ t('close') }}</button>
      </div>
    </template>
  </Sheet>
</template>
