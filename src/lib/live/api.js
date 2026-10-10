// Client for the Part A backend (docs/API_CONTRACT.md). Plain fetch, bearer
// token in localStorage. Every function throws an Error with .status/.code on
// a non-2xx so screens can show a real message instead of failing silently.

const TOKEN_KEY = 'aeko.session'
const USER_KEY = 'aeko.user'

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function storeSession(token, user) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
    else localStorage.removeItem(USER_KEY)
  } catch {
    /* private mode — session lives for this tab only */
  }
}

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  let data = null
  try {
    data = await res.json()
  } catch {
    /* empty body */
  }
  if (!res.ok) {
    const err = new Error(data?.error || `HTTP ${res.status}`)
    err.status = res.status
    err.code = data?.error
    throw err
  }
  return data
}

// Guest brand mode: search and voice work without a sign-in. The first live
// action quietly opens a session as the demo brand (Doughmere Cookie Co.).
const GUEST_BRAND = { email: 'maya@doughmere.demo', password: 'aeko2026' }

export async function ensureBrandSession() {
  const u = getStoredUser()
  if (getToken() && u && (u.role === 'BRAND' || u.role === 'ADMIN')) return u
  return api.login(GUEST_BRAND.email, GUEST_BRAND.password)
}

export const api = {
  health: () => request('GET', '/api/health'),

  async login(email, password) {
    const data = await request('POST', '/api/auth/login', { email, password })
    storeSession(data.token, data.user)
    return data.user
  },
  me: () => request('GET', '/api/auth/me'),
  async logout() {
    try {
      await request('POST', '/api/auth/logout')
    } finally {
      storeSession(null, null)
    }
  },

  parseRequest: (query, language) => request('POST', '/api/requests/parse', { query, language }),
  createRequest: (payload) => request('POST', '/api/requests', payload),
  listRequests: () => request('GET', '/api/requests'),
  getRequest: (id) => request('GET', `/api/requests/${id}`),
  approveRequest: (id) => request('POST', `/api/requests/${id}/approve`),
  callbackPending: () => request('GET', '/api/requests/callback'),
  callbackUpdate: (id, body) => request('POST', `/api/requests/${id}/callback`, body),
  matchRequest: (id) => request('POST', `/api/requests/${id}/match`),
  startCalls: (id, supplierIds) => request('POST', `/api/requests/${id}/calls`, supplierIds ? { supplierIds } : {}),

  incomingCall: () => request('GET', '/api/calls/incoming'),
  getCall: (id) => request('GET', `/api/calls/${id}`),
  acceptCall: (id) => request('POST', `/api/calls/${id}/accept`),
  callEvent: (id, ev) => request('POST', `/api/calls/${id}/events`, ev),
  callOutcome: (id, payload) => request('POST', `/api/calls/${id}/outcome`, payload),
  endCall: (id) => request('POST', `/api/calls/${id}/end`),

  liveToken: (purpose, callId) => request('POST', '/api/live/token', { purpose, callId }),
  tts: (text) => request('POST', '/api/tts', { text }),
  liveContext: (callId) => request('GET', `/api/live/context?callId=${encodeURIComponent(callId)}`),

  activeCalls: () => request('GET', '/api/calls/active'),
  config: () => request('GET', '/api/config'),
  resetDemo: () => request('POST', '/api/admin/reset-demo'),
}

