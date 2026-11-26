import { tg } from './telegram'

// When the app (Vercel/Cloudflare) and the server (Railway) live at different addresses,
// set VITE_API_URL=https://your-server.up.railway.app when building the frontend.
const BASE = (import.meta.env.VITE_API_URL || 'https://gb-production-f5f46c29.up.railway.app').replace(/\/+$/, '')

// car photos / receipts are stored on the server: "/uploads/x.jpg" -> full address
export const asset = (u) => (u && u.startsWith('/') ? BASE + u : u)

export class ApiError extends Error {
  constructor(status, code, data) {
    super(code)
    this.status = status
    this.code = code
    this.data = data
  }
}

// Outside Telegram you can test with  http://localhost:5173/?dev=1001
// (works only when the server has DEV_MODE=true)
function devId() {
  const q = new URLSearchParams(location.search).get('dev')
  if (q) localStorage.setItem('devUser', q)
  return localStorage.getItem('devUser') || (import.meta.env.DEV ? '1000' : null)
}

function headers() {
  const h = {}
  if (tg?.initData) h['x-init-data'] = tg.initData
  else if (devId()) h['x-dev-user'] = devId()
  return h
}

async function request(method, path, body) {
  const opts = { method, headers: headers() }
  if (body instanceof FormData) opts.body = body
  else if (body !== undefined) {
    opts.headers['content-type'] = 'application/json'
    opts.body = JSON.stringify(body)
  }
  let res
  try {
    res = await fetch(BASE + path, opts)
  } catch {
    throw new ApiError(0, 'network', null)
  }
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(res.status, data?.error || 'error', data)
  return data
}

export const api = {
  get: (p) => request('GET', p),
  post: (p, b) => request('POST', p, b ?? {}),
  patch: (p, b) => request('PATCH', p, b),
  del: (p) => request('DELETE', p),
}
