import { tg } from './telegram'

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
    res = await fetch(path, opts)
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
