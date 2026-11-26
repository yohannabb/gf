<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import Icon from '@/components/Icon.vue'
import { api, ApiError } from '@/services/api'
import { fmt, pad4 } from '@/services/format'
import { useApp } from '@/stores/app'
import { ask } from '@/services/telegram'

// The admin panel is English only (it is for the owner).
const app = useApp()
const tab = ref('orders')
const stats = ref(null)

const ERR = {
  tickets_1_to_4000: 'Tickets must be between 1 and 4000.',
  bad_end_date: 'End date must be in the future.',
  image_required: 'Please choose a car photo.',
  invalid_image: 'Image must be PNG, JPG or WEBP.',
  missing_fields: 'Please fill all fields.',
  order_not_pending: 'This order was already handled.',
  pending_orders_exist: 'Handle all pending orders first.',
  no_tickets: 'No approved tickets to draw from.',
  already_drawn: 'Winner already drawn.',
  lottery_has_orders: 'This lottery has orders and cannot be deleted.',
  file_too_large: 'File is larger than 10MB.',
  empty_announcement: 'Write some text or choose a photo.',
  text_too_long: 'Text is too long (max 4000 characters).',
  broadcast_running: 'Another announcement is still being sent. Please wait.',
  bot_off: 'The bot is not running. Check BOT_TOKEN and restart the server.',
  admin_blocked_bot: 'Open your bot and press START first, then try again.',
  telegram_error: 'Telegram rejected the message (check the photo size and format).',
  no_users: 'No users to send to yet.',
}
const fail = (e) => app.showToast(ERR[e.code] || 'Something went wrong.')
const ok = (m) => app.showToast(m, 'ok')

async function loadStats() {
  try { stats.value = await api.get('/api/admin/stats') } catch {}
}

/* ---------------- orders ---------------- */
const orderFilter = ref('PENDING')
const orders = ref([])
const rejecting = ref(null)
const reason = ref('')
async function loadOrders() {
  orders.value = await api.get('/api/admin/orders' + (orderFilter.value ? `?status=${orderFilter.value}` : ''))
}
async function approve(o) {
  if (!(await ask(`Approve order #${o.code}?`))) return
  try { await api.post(`/api/admin/orders/${o.id}/approve`); ok('Approved'); await loadOrders(); loadStats() } catch (e) { fail(e) }
}
async function reject(o) {
  try {
    await api.post(`/api/admin/orders/${o.id}/reject`, { reason: reason.value })
    rejecting.value = null; reason.value = ''
    ok('Rejected'); await loadOrders(); loadStats()
  } catch (e) { fail(e) }
}
watch(orderFilter, loadOrders)

/* ---------------- lotteries ---------------- */
const lotteries = ref([])
const showForm = ref(false)
const form = ref({ title: '', carName: '', carColor: '', ticketPrice: 6000, totalTickets: 4000, endsAt: '', featured: false })
const photo = ref(null)
async function loadLotteries() { lotteries.value = await api.get('/api/admin/lotteries') }
async function createLottery() {
  const f = new FormData()
  for (const [k, v] of Object.entries(form.value)) f.append(k, k === 'endsAt' && v ? new Date(v).toISOString() : v)
  if (photo.value) f.append('image', photo.value)
  try {
    await api.post('/api/admin/lotteries', f)
    ok('Lottery created'); showForm.value = false; photo.value = null
    await loadLotteries(); loadStats()
  } catch (e) { fail(e) }
}
async function patchLottery(l, body) {
  try { await api.patch(`/api/admin/lotteries/${l.id}`, body); await loadLotteries() } catch (e) { fail(e) }
}
async function draw(l) {
  if (!(await ask(`Draw the winner of "${l.title}" now? This cannot be undone.`))) return
  try {
    const r = await api.post(`/api/admin/lotteries/${l.id}/draw`)
    ok(`Winner: ticket ${pad4(r.winnerNumber)}`); await loadLotteries()
  } catch (e) { fail(e) }
}
async function removeLottery(l) {
  if (!(await ask(`Delete "${l.title}"?`))) return
  try { await api.del(`/api/admin/lotteries/${l.id}`); await loadLotteries() } catch (e) { fail(e) }
}

/* ---------------- banks ---------------- */
const banks = ref([])
const bankForm = ref({ bankName: '', accountName: 'Getachew Fikadu Jirata', accountNumber: '' })
async function loadBanks() { banks.value = await api.get('/api/admin/banks') }
async function addBank() {
  try {
    await api.post('/api/admin/banks', bankForm.value)
    bankForm.value.bankName = ''; bankForm.value.accountNumber = ''
    ok('Bank added'); await loadBanks()
  } catch (e) { fail(e) }
}
async function toggleBank(b) { await api.patch(`/api/admin/banks/${b.id}`, { active: !b.active }); await loadBanks() }
async function removeBank(b) {
  if (!(await ask(`Delete ${b.bankName}?`))) return
  await api.del(`/api/admin/banks/${b.id}`); await loadBanks()
}

/* ---------------- announcements ---------------- */
const msg = ref('')
const adPhoto = ref(null)
const adPreview = ref(null)
const casts = ref([])
const sending = ref(false)
let poll
function pickAdPhoto(e) {
  const f = e.target.files?.[0]
  e.target.value = ''
  if (!f) return
  if (!['image/png', 'image/jpeg'].includes(f.type)) return app.showToast('Photo must be PNG or JPG.')
  if (f.size > 10 * 1024 * 1024) return app.showToast(ERR.file_too_large)
  if (adPreview.value) URL.revokeObjectURL(adPreview.value)
  adPhoto.value = f
  adPreview.value = URL.createObjectURL(f)
}
function clearAdPhoto() {
  if (adPreview.value) URL.revokeObjectURL(adPreview.value)
  adPhoto.value = adPreview.value = null
}
async function loadCasts() {
  try {
    casts.value = await api.get('/api/admin/broadcasts')
  } catch {}
  clearTimeout(poll)
  if (casts.value.some((c) => c.status === 'SENDING')) poll = setTimeout(loadCasts, 3000)
}
async function sendAnnouncement(test) {
  if (sending.value) return
  if (!msg.value.trim() && !adPhoto.value) return app.showToast(ERR.empty_announcement)
  if (!test) {
    const n = stats.value?.users ?? 0
    if (!(await ask(`Send this announcement to ${n} user(s) now? It cannot be undone.`))) return
  }
  sending.value = true
  try {
    const f = new FormData()
    f.append('text', msg.value)
    f.append('test', test ? 'true' : 'false')
    if (adPhoto.value) f.append('photo', adPhoto.value)
    await api.post('/api/admin/broadcast', f)
    if (test) ok('Test sent to your Telegram')
    else {
      ok('Sending started')
      msg.value = ''
      clearAdPhoto()
      loadCasts()
    }
  } catch (e) {
    fail(e)
  } finally {
    sending.value = false
  }
}
watch(tab, (v) => v === 'announce' && loadCasts())
onUnmounted(() => clearTimeout(poll))

onMounted(() => { loadStats(); loadOrders(); loadLotteries(); loadBanks() })
const statusColor = { PENDING: 'var(--gold)', APPROVED: 'var(--green)', REJECTED: 'var(--red)' }
const dt = (d) => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
</script>

<template>
  <h1 class="font-display font-bold text-[26px] mt-2 mb-4">Admin panel</h1>

  <div v-if="stats" class="grid grid-cols-2 gap-3 mb-4">
    <div class="card p-4"><div class="muted text-[13px]">Pending orders</div><b class="font-display text-[26px] gold">{{ stats.pending }}</b></div>
    <div class="card p-4"><div class="muted text-[13px]">Tickets sold</div><b class="font-display text-[26px]">{{ fmt(stats.ticketsTaken) }}</b></div>
  </div>

  <div class="flex gap-2 mb-4">
    <button v-for="x in ['orders', 'lotteries', 'banks', 'announce']" :key="x" class="chip capitalize" :class="{ on: tab === x }" @click="tab = x">{{ x }}</button>
  </div>

  <!-- ORDERS -->
  <section v-if="tab === 'orders'">
    <div class="flex gap-2 mb-3 overflow-x-auto">
      <button v-for="s in ['PENDING', 'APPROVED', 'REJECTED', '']" :key="s" class="chip" :class="{ on: orderFilter === s }" @click="orderFilter = s">
        {{ s || 'ALL' }}
      </button>
    </div>
    <p v-if="!orders.length" class="muted text-center py-10">No orders.</p>
    <article v-for="o in orders" :key="o.id" class="card p-4 mb-3">
      <div class="flex justify-between items-center">
        <b>#{{ o.code }}</b>
        <span class="text-[12px] font-bold px-2.5 py-1 rounded-full" :style="{ color: statusColor[o.status], border: '1px solid ' + statusColor[o.status] }">{{ o.status }}</span>
      </div>
      <div class="muted text-[13px] mt-1">{{ dt(o.createdAt) }} · {{ o.lottery }}</div>
      <div class="mt-2 text-[15px]"><b>{{ o.fullName }}</b> · {{ o.phone }}</div>
      <div class="muted text-[13px]">Telegram ID {{ o.user }}<span v-if="o.bank"> · {{ o.bank }}</span><span v-if="o.senderAccount"> · from {{ o.senderAccount }}</span></div>
      <div class="flex flex-wrap gap-2 mt-2"><span v-for="n in o.numbers" :key="n" class="num-chip">{{ pad4(n) }}</span></div>
      <div class="flex items-center gap-3 mt-3">
        <a :href="o.receiptUrl" target="_blank" rel="noopener" class="flex-none">
          <img :src="o.receiptUrl" alt="receipt" class="w-20 h-20 rounded-xl object-cover" style="border: 1px solid var(--line)" />
        </a>
        <div class="flex-1 text-right"><div class="muted text-[13px]">Total</div><b class="font-display text-[22px] gold">{{ fmt(o.total) }} Birr</b></div>
      </div>
      <p v-if="o.rejectReason" class="m-0 mt-2 text-[14px]" style="color: var(--taken-text)">Reason: {{ o.rejectReason }}</p>
      <div v-if="o.status === 'PENDING'" class="mt-3">
        <div v-if="rejecting === o.id" class="flex flex-col gap-2">
          <div class="ibox" style="height: 46px"><input v-model="reason" placeholder="Reason (optional)" maxlength="200" /></div>
          <div class="flex gap-2">
            <button class="btn btn-ghost btn-sm flex-1" @click="rejecting = null">Cancel</button>
            <button class="btn btn-danger btn-sm flex-1" @click="reject(o)">Confirm reject</button>
          </div>
        </div>
        <div v-else class="flex gap-2">
          <button class="btn btn-danger btn-sm flex-1" @click="rejecting = o.id; reason = ''">Reject</button>
          <button class="btn btn-green btn-sm flex-1" @click="approve(o)">Approve</button>
        </div>
      </div>
    </article>
  </section>

  <!-- LOTTERIES -->
  <section v-if="tab === 'lotteries'">
    <button class="btn btn-gold btn-sm w-full mb-3" @click="showForm = !showForm"><Icon name="plus" :size="16" /> New lottery</button>
    <form v-if="showForm" class="card p-4 mb-4 flex flex-col gap-3" @submit.prevent="createLottery">
      <div class="ibox"><input v-model="form.title" placeholder="Lottery name (e.g. 6 Gech EV Makina Equb)" required /></div>
      <div class="ibox"><input v-model="form.carName" placeholder="Car name (e.g. BYD Leo Pard 7)" required /></div>
      <div class="ibox"><input v-model="form.carColor" placeholder="Car colour (e.g. Black)" required /></div>
      <div class="flex gap-3">
        <div class="ibox flex-1"><input v-model.number="form.ticketPrice" type="number" min="1" placeholder="Ticket price" required /></div>
        <div class="ibox flex-1"><input v-model.number="form.totalTickets" type="number" min="1" max="4000" placeholder="Tickets (max 4000)" required /></div>
      </div>
      <label class="label m-0">Ends at</label>
      <div class="ibox"><input v-model="form.endsAt" type="datetime-local" required /></div>
      <label class="label m-0">Car photo (PNG, JPG or WEBP)</label>
      <input type="file" accept="image/png,image/jpeg,image/webp" class="muted" @change="photo = $event.target.files[0]" required />
      <label class="flex items-center gap-2 font-semibold"><input v-model="form.featured" type="checkbox" /> Featured (shown at the top of Home)</label>
      <button class="btn btn-green btn-sm">Create lottery</button>
    </form>

    <article v-for="l in lotteries" :key="l.id" class="card p-4 mb-3">
      <div class="flex gap-3">
        <img :src="l.imageUrl" alt="" class="w-20 h-20 rounded-2xl object-cover flex-none" />
        <div class="min-w-0 flex-1">
          <b class="block truncate">{{ l.title }}</b>
          <div class="muted text-[13px]">{{ l.carName }} · {{ l.carColor }}</div>
          <div class="text-[13px] mt-1">{{ fmt(l.sold) }}/{{ fmt(l.totalTickets) }} · {{ fmt(l.ticketPrice) }} Birr</div>
          <div class="text-[12px] font-bold mt-1" :style="{ color: l.status === 'ACTIVE' ? 'var(--green)' : 'var(--gold)' }">
            {{ l.status }}<span v-if="l.winnerNumber"> · Winner {{ pad4(l.winnerNumber) }}</span>
          </div>
        </div>
      </div>
      <div class="flex flex-wrap gap-2 mt-3">
        <button v-if="l.status !== 'DRAWN'" class="btn btn-ghost btn-sm" @click="patchLottery(l, { featured: !l.featured })">{{ l.featured ? '★ Unfeature' : '☆ Feature' }}</button>
        <button v-if="l.status === 'ACTIVE'" class="btn btn-ghost btn-sm" @click="patchLottery(l, { status: 'CLOSED' })">Close sales</button>
        <button v-else-if="l.status === 'CLOSED'" class="btn btn-ghost btn-sm" @click="patchLottery(l, { status: 'ACTIVE' })">Reopen</button>
        <button v-if="l.status !== 'DRAWN'" class="btn btn-gold btn-sm" @click="draw(l)"><Icon name="trophy" :size="16" /> Draw winner</button>
        <button class="btn btn-danger btn-sm" @click="removeLottery(l)"><Icon name="trash" :size="16" /></button>
      </div>
    </article>
  </section>

  <!-- ANNOUNCE -->
  <section v-if="tab === 'announce'">
    <div class="card p-4 flex flex-col gap-3">
      <b>New announcement</b>
      <p class="muted text-[13px] m-0">Goes to everyone who started the bot ({{ stats?.users ?? '…' }} users). Plain text only.</p>
      <div class="ibox area">
        <textarea v-model="msg" rows="5" maxlength="4000" placeholder="Write your message…"></textarea>
      </div>
      <div class="muted text-[12px] text-right">{{ msg.length }}/4000</div>

      <div v-if="adPreview" class="relative">
        <img :src="adPreview" alt="photo" class="w-full rounded-2xl object-cover" style="max-height: 240px" />
        <button class="absolute top-2 right-2 grid place-items-center w-9 h-9 rounded-full"
                style="background: rgba(0,0,0,.65); color: #fff" @click="clearAdPhoto" aria-label="remove photo">
          <Icon name="x" :size="18" />
        </button>
      </div>
      <label v-else class="btn btn-ghost btn-sm" style="cursor: pointer">
        <Icon name="upload" :size="16" /> Add photo (PNG or JPG)
        <input type="file" accept="image/png,image/jpeg" hidden @change="pickAdPhoto" />
      </label>
      <p v-if="adPhoto && msg.length > 1024" class="muted text-[12px] m-0">
        Text is longer than 1024 characters, so it will be sent as a second message after the photo.
      </p>

      <div class="flex gap-2">
        <button class="btn btn-ghost btn-sm flex-1" :disabled="sending" @click="sendAnnouncement(true)">Send test to me</button>
        <button class="btn btn-gold btn-sm flex-1" :disabled="sending" @click="sendAnnouncement(false)">
          {{ sending ? 'Please wait…' : 'Send to everyone' }}
        </button>
      </div>
    </div>

    <h3 class="font-display text-[16px] muted mt-5 mb-2">Sent announcements</h3>
    <p v-if="!casts.length" class="muted text-center py-6 text-[14px]">Nothing sent yet.</p>
    <article v-for="c in casts" :key="c.id" class="card p-4 mb-3">
      <div class="flex justify-between items-center gap-2">
        <span class="muted text-[13px]">{{ dt(c.createdAt) }}<span v-if="c.hasPhoto"> · 📷</span></span>
        <span class="text-[12px] font-bold px-2.5 py-1 rounded-full"
              :style="{ color: c.status === 'DONE' ? 'var(--green)' : 'var(--gold)', border: '1px solid ' + (c.status === 'DONE' ? 'var(--green)' : 'var(--gold)') }">
          {{ c.status === 'SENDING' ? 'SENDING…' : c.status }}
        </span>
      </div>
      <p class="m-0 mt-2 text-[14px] break-words">{{ c.text.length > 140 ? c.text.slice(0, 140) + '…' : c.text || '(photo only)' }}</p>
      <div class="bar mt-3"><i :style="{ width: Math.round(((c.sent + c.blocked + c.failed) / Math.max(c.total, 1)) * 100) + '%' }"></i></div>
      <div class="muted text-[13px] mt-2">
        Delivered {{ c.sent }} / {{ c.total }}
        <span v-if="c.blocked"> · blocked the bot {{ c.blocked }}</span>
        <span v-if="c.failed"> · failed {{ c.failed }}</span>
      </div>
    </article>
  </section>

  <!-- BANKS -->
  <section v-if="tab === 'banks'">
    <article v-for="b in banks" :key="b.id" class="card p-4 mb-3 flex items-center gap-3">
      <div class="min-w-0 flex-1">
        <b>{{ b.bankName }}</b>
        <div class="muted text-[13px]">{{ b.accountName }} · {{ b.accountNumber }}</div>
      </div>
      <button class="chip" :class="{ on: b.active }" @click="toggleBank(b)">{{ b.active ? 'Active' : 'Hidden' }}</button>
      <button class="btn btn-danger btn-sm" @click="removeBank(b)"><Icon name="trash" :size="16" /></button>
    </article>
    <form class="card p-4 flex flex-col gap-3" @submit.prevent="addBank">
      <b>Add bank account</b>
      <div class="ibox"><input v-model="bankForm.bankName" placeholder="Bank name" required /></div>
      <div class="ibox"><input v-model="bankForm.accountName" placeholder="Account holder" required /></div>
      <div class="ibox"><input v-model="bankForm.accountNumber" placeholder="Account number" required /></div>
      <button class="btn btn-gold btn-sm">Add</button>
    </form>
  </section>
</template>
