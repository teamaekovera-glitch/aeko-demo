#!/usr/bin/env node
// Offline verification of the whole API surface: runs the real handler stack
// against an in-memory store (no Supabase, no Gemini network calls).
// Gemini-dependent paths exercise the fallback parser / config errors instead.
// Run: npm run selftest
import http from 'node:http'
import { createApp } from '../api/_lib/app.js'

const PASSWORD = 'aeko2026'

const USERS = [
  { id: 'usr_maya', email: 'maya@doughmere.demo', password: PASSWORD, role: 'BRAND', name: 'Maya Chen', company: 'Doughmere Cookie Co.', supplier_id: null },
  { id: 'usr_admin', email: 'admin@aekovera.demo', password: PASSWORD, role: 'ADMIN', name: 'Aeko Control', company: 'Aekovera', supplier_id: null },
  { id: 'usr_sup_stonefurrow', email: 'ops@stonefurrow.demo', password: PASSWORD, role: 'SUPPLIER', name: 'Supplier One', company: 'Stonefurrow Crumb Co.', supplier_id: 'sup_stonefurrow' },
  { id: 'usr_sup_ridgeline', email: 'ops@ridgeline.demo', password: PASSWORD, role: 'SUPPLIER', name: 'Supplier Two', company: 'Ridgeline Baking Co.', supplier_id: 'sup_ridgeline' },
  { id: 'usr_sup_wheatwind', email: 'ops@wheatwind.demo', password: PASSWORD, role: 'SUPPLIER', name: 'Supplier Three', company: 'Wheatwind Bakehouse', supplier_id: 'sup_wheatwind' },
]

// The 3 live demo suppliers + 3 background rows (enough to exercise ranking + tiebreaks).
const SUPPLIERS = [
  { id: 'sup_stonefurrow', name: 'Stonefurrow Crumb Co.', location: 'Lancaster, PA', email: 'sourcing@stonefurrow.demo', category: 'cookies', capabilities: ['stuffed cookies', 'dedicated allergen room', 'flow-wrap'], equipment: ['tunnel oven (40 m)', 'co-extruder'], certifications: [], moq: 50000, capacity_per_month: 2000000, languages: ['en'], is_live_demo: true, talking_points: null },
  { id: 'sup_ridgeline', name: 'Ridgeline Baking Co.', location: 'Columbus, OH', email: 'sourcing@ridgeline.demo', category: 'cookies', capabilities: ['seasonal tins', 'private label'], equipment: ['rack ovens'], certifications: [], moq: 10000, capacity_per_month: 150000, languages: ['en', 'hi', 'mr'], is_live_demo: true, talking_points: null },
  { id: 'sup_wheatwind', name: 'Wheatwind Bakehouse', location: 'Wichita, KS', email: 'sourcing@wheatwind.demo', category: 'cookies', capabilities: ['crackers', 'flatbreads'], equipment: ['tunnel oven'], certifications: [], moq: 25000, capacity_per_month: 900000, languages: ['en', 'no'], is_live_demo: true, talking_points: null },
  { id: 'sup_keystone', name: 'Keystone Culinary Group', location: 'Denver, CO', email: 'sourcing@keystone-culinary-group.demo', category: 'cookies', capabilities: ['sandwich cookies', 'shortbread', 'tray bakes'], equipment: ['rotary ovens', 'wire-cut depositor'], certifications: ['FDA', 'SQF'], moq: 20000, capacity_per_month: 420000, languages: ['en'], is_live_demo: false, talking_points: null },
  { id: 'sup_sunbelt', name: 'Sunbelt Cuisine Labs', location: 'Atlanta, GA', email: 'sourcing@sunbelt-cuisine-labs.demo', category: 'cookies', capabilities: ['biscuits', 'seasonal tins'], equipment: ['rack ovens'], certifications: ['FDA', 'cGMP'], moq: 15000, capacity_per_month: 260000, languages: ['en'], is_live_demo: false, talking_points: null },
  { id: 'sup_summit-ridge', name: 'Summit Ridge Snack Works', location: 'Salt Lake City, UT', email: 'sourcing@summit-ridge-snack.demo', category: 'snacks', capabilities: ['crackers', 'pretzel pieces'], equipment: ['tunnel oven', 'seasoning tumblers'], certifications: ['FDA', 'SQF'], moq: 18000, capacity_per_month: 400000, languages: ['en'], is_live_demo: false, talking_points: null },
]

function makeMemoryStore() {
  const db = {
    users: new Map(USERS.map((u) => [u.id, { ...u }])),
    sessions: new Map(),
    suppliers: new Map(SUPPLIERS.map((s) => [s.id, { ...s }])),
    requests: new Map(),
    matches: new Map(),
    calls: new Map(),
    events: [],
  }
  let eventSeq = 1
  const clone = (r) => ({ ...r })
  const byCreatedDesc = (a, b) => String(b.created_at || '').localeCompare(String(a.created_at || ''))
  return {
    async ping() { return true },
    async getUserByEmail(email) { return [...db.users.values()].find((u) => u.email === email) || null },
    async getUserById(id) { return db.users.get(id) || null },
    async getUserByToken(token) {
      const s = db.sessions.get(token)
      return s ? db.users.get(s.user_id) || null : null
    },
    async createSession(token, userId) { db.sessions.set(token, { token, user_id: userId }) },
    async deleteSession(token) { db.sessions.delete(token) },
    async getSupplier(id) { return db.suppliers.get(id) || null },
    async listSuppliers() { return [...db.suppliers.values()].sort((a, b) => a.name.localeCompare(b.name)) },
    async insertRequest(row) {
      const r = { created_at: new Date().toISOString(), ...row }
      db.requests.set(r.id, r)
      return clone(r)
    },
    async getRequest(id) { return db.requests.get(id) || null },
    async listRequests({ brandUserId } = {}) {
      return [...db.requests.values()].filter((r) => !brandUserId || r.brand_user_id === brandUserId).sort(byCreatedDesc)
    },
    async updateRequest(id, patch) {
      const r = db.requests.get(id)
      if (!r) throw new Error('request not found')
      Object.assign(r, patch)
      return clone(r)
    },
    async latestRequestByStatuses(statuses, brandUserId = null) {
      const rows = [...db.requests.values()]
        .filter((r) => statuses.includes(r.status) && (!brandUserId || r.brand_user_id === brandUserId))
        .sort(byCreatedDesc)
      return rows[0] || null
    },
    async replaceMatches(requestId, rows) {
      for (const [k, v] of db.matches) if (v.request_id === requestId) db.matches.delete(k)
      for (const row of rows) db.matches.set(row.id, row)
    },
    async listMatchesForRequest(requestId) {
      return [...db.matches.values()].filter((m) => m.request_id === requestId).sort((a, b) => a.rank - b.rank)
    },
    async insertCalls(rows) {
      const out = rows.map((r) => {
        const c = { created_at: new Date().toISOString(), ...r }
        db.calls.set(c.id, c)
        return clone(c)
      })
      return out
    },
    async getCall(id) { return db.calls.get(id) || null },
    async updateCall(id, patch) {
      const c = db.calls.get(id)
      if (!c) throw new Error('call not found')
      Object.assign(c, patch)
      return clone(c)
    },
    async listCalls({ supplierId, requestId, statuses, limit = 200, orderDesc = true } = {}) {
      let rows = [...db.calls.values()].filter(
        (c) =>
          (!supplierId || c.supplier_id === supplierId) &&
          (!requestId || c.request_id === requestId) &&
          (!statuses?.length || statuses.includes(c.status))
      )
      rows = rows.sort((a, b) => (orderDesc ? byCreatedDesc(a, b) : -byCreatedDesc(a, b)))
      return rows.slice(0, limit)
    },
    async insertEvent(row) {
      const r = { id: eventSeq++, created_at: new Date().toISOString(), ...row }
      db.events.push(r)
      return clone(r)
    },
    async listEventsForCalls(callIds) {
      return db.events.filter((e) => callIds.includes(e.call_id)).sort((a, b) => a.id - b.id)
    },
    async resetDemo() {
      db.requests.clear()
      db.matches.clear()
      db.calls.clear()
      db.events.length = 0
    },
  }
}

// ---------------------------------------------------------------- harness --
let failures = 0
function check(name, cond, extra) {
  if (cond) console.log(`  PASS ${name}`)
  else {
    failures++
    console.error(`  FAIL ${name}${extra !== undefined ? ` — ${JSON.stringify(extra)}` : ''}`)
  }
}

let BASE = ''
async function req(method, path, { token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let jsonOut = null
  try { jsonOut = text ? JSON.parse(text) : null } catch { /* non-JSON */ }
  return { status: res.status, json: jsonOut, text }
}

const app = createApp({ store: makeMemoryStore() })
const server = http.createServer((req, res) => app(req, res))
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
BASE = `http://127.0.0.1:${server.address().port}`
const call = req

try {
  console.log('1. health')
  {
    const r = await call('GET', '/api/health')
    check('200 with ok/db/geminiKey', r.status === 200 && r.json?.ok === true && r.json?.db === 'supabase' && r.json?.geminiKey === 'none', r.json)
  }

  console.log('2. auth')
  const tokens = {}
  for (const u of USERS) {
    const r = await call('POST', '/api/auth/login', { body: { email: u.email, password: PASSWORD } })
    check(`login ${u.email}`, r.status === 200 && typeof r.json?.token === 'string' && r.json?.user?.id === u.id, r.json)
    check(`login ${u.email} camelCase supplierId`, r.json?.user && !('supplier_id' in r.json.user) && 'supplierId' in r.json.user)
    tokens[u.id] = r.json?.token
  }
  {
    const bad = await call('POST', '/api/auth/login', { body: { email: 'maya@doughmere.demo', password: 'wrong' } })
    check('wrong password 401', bad.status === 401 && bad.json?.error === 'INVALID_CREDENTIALS', bad.json)
    const noAuth = await call('GET', '/api/auth/me')
    check('missing bearer 401', noAuth.status === 401, noAuth.json)
    const me = await call('GET', '/api/auth/me', { token: tokens.usr_maya })
    check('me returns user', me.status === 200 && me.json?.user?.email === 'maya@doughmere.demo', me.json)
  }

  console.log('3. parse (Gemini absent -> fallback parser)')
  {
    const q = 'Stuffed cookies, 500,000 packs, tunnel oven, allergen-controlled line'
    const r = await call('POST', '/api/requests/parse', { token: tokens.usr_maya, body: { query: q } })
    check('parse 200', r.status === 200, r.json)
    check('category cookies', r.json?.parsed?.category === 'cookies', r.json?.parsed)
    check('volume 500000', r.json?.parsed?.volume === 500000, r.json?.parsed)
    check('specialty.equipment has tunnel oven', r.json?.parsed?.specialty?.equipment?.includes('tunnel oven'), r.json?.parsed?.specialty)
    const k = await call('POST', '/api/requests/parse', { token: tokens.usr_maya, body: { query: '500k packs of stuffed cookies, tunnel oven' } })
    check('500k -> 500000', k.json?.parsed?.volume === 500000, k.json?.parsed)
    const h = await call('POST', '/api/requests/parse', { token: tokens.usr_maya, body: { query: 'half a million stuffed cookies with a tunnel oven' } })
    check('half a million -> 500000', h.json?.parsed?.volume === 500000, h.json?.parsed)
    const noBody = await call('POST', '/api/requests/parse', { token: tokens.usr_maya, body: {} })
    check('empty query 400', noBody.status === 400 && noBody.json?.error === 'VALIDATION', noBody.json)
  }

  console.log('4. create + match (live trio top 3)')
  let requestId, matches
  {
    const parsed = (await call('POST', '/api/requests/parse', { token: tokens.usr_maya, body: { query: 'Stuffed cookies, 500,000 packs, tunnel oven, allergen-controlled line' } })).json.parsed
    const created = await call('POST', '/api/requests', {
      token: tokens.usr_maya,
      body: { rawQuery: 'Stuffed cookies, 500,000 packs, tunnel oven, allergen-controlled line', inputMode: 'text', language: 'en', ...parsed },
    })
    check('create 200, status NEW', created.status === 200 && created.json?.request?.status === 'NEW', created.json)
    requestId = created.json?.request?.id
    check('brandUserId set', created.json?.request?.brandUserId === 'usr_maya', created.json?.request)

    const supplierCreate = await call('POST', '/api/requests', { token: tokens.usr_sup_stonefurrow, body: { rawQuery: 'x' } })
    check('supplier cannot create 403', supplierCreate.status === 403, supplierCreate.json)

    const m = await call('POST', `/api/requests/${requestId}/match`, { token: tokens.usr_maya })
    check('match 200', m.status === 200, m.json)
    matches = m.json?.matches || []
    const top3 = matches.slice(0, 3).map((x) => x.supplier.id).sort()
    check('scanned = 6', m.json?.scanned === 6, m.json?.scanned)
    check('request MATCHING', m.json?.request?.status === 'MATCHING', m.json?.request)
    check('live trio top 3', JSON.stringify(top3) === JSON.stringify(['sup_ridgeline', 'sup_stonefurrow', 'sup_wheatwind']), matches.map((x) => `${x.supplier.id}:${x.score}`))
    check('rank fields 1..n', matches[0]?.rank === 1 && matches[1]?.rank === 2, matches.map((x) => x.rank))
  }

  console.log('5. calls (3 RINGING, per-supplier incoming)')
  let calls
  {
    const c = await call('POST', `/api/requests/${requestId}/calls`, { token: tokens.usr_maya, body: {} })
    check('create calls 200', c.status === 200, c.json)
    calls = c.json?.calls || []
    check('3 calls', calls.length === 3, calls.length)
    check('all RINGING', calls.every((x) => x.status === 'RINGING'), calls.map((x) => x.status))
    for (const u of USERS.filter((u) => u.role === 'SUPPLIER')) {
      const inc = await call('GET', '/api/calls/incoming', { token: tokens[u.id] })
      const okCall = inc.json?.call && inc.json.call.supplierId === u.supplier_id
      check(`incoming ${u.supplier_id}`, inc.status === 200 && okCall, inc.json)
    }
    const brandIncoming = await call('GET', '/api/calls/incoming', { token: tokens.usr_maya })
    check('brand cannot use incoming 403', brandIncoming.status === 403, brandIncoming.json)
    const active = await call('GET', '/api/calls/active', { token: tokens.usr_admin })
    check('admin active sees 3 calls', active.status === 200 && active.json?.calls?.length === 3, active.json?.calls?.length)
  }

  console.log('6. call lifecycle (accept, events, outcomes, end)')
  {
    const stone = calls.find((c) => c.supplierId === 'sup_stonefurrow')
    const ridge = calls.find((c) => c.supplierId === 'sup_ridgeline')
    const wheat = calls.find((c) => c.supplierId === 'sup_wheatwind')

    const acc = await call('POST', `/api/calls/${stone.id}/accept`, { token: tokens.usr_sup_stonefurrow })
    check('accept CONNECTED + startedAt', acc.status === 200 && acc.json?.call?.status === 'CONNECTED' && !!acc.json?.call?.startedAt, acc.json)

    const ev = await call('POST', `/api/calls/${stone.id}/events`, {
      token: tokens.usr_sup_stonefurrow,
      body: { kind: 'transcript', speaker: 'aeko', text: 'Hi, it’s Aeko from Aekovera.' },
    })
    check('event ok', ev.status === 200 && ev.json?.ok === true, ev.json)
    await call('POST', `/api/calls/${stone.id}/events`, { token: tokens.usr_sup_stonefurrow, body: { kind: 'transcript', speaker: 'supplier', text: 'Yes, we run a tunnel oven.' } })

    const otherSupplier = await call('POST', `/api/calls/${stone.id}/accept`, { token: tokens.usr_sup_ridgeline })
    check('other supplier cannot touch 403', otherSupplier.status === 403, otherSupplier.json)

    const yes = await call('POST', `/api/calls/${stone.id}/outcome`, {
      token: tokens.usr_sup_stonefurrow,
      body: { outcome: 'YES', reason: 'Tunnel oven + allergen room, 2M/mo', language: 'en' },
    })
    check('outcome YES introSlot', yes.status === 200 && yes.json?.call?.outcome === 'YES' && yes.json?.call?.introSlot === 'Tue 10:00', yes.json)
    const afterYes = await call('GET', `/api/requests/${requestId}`, { token: tokens.usr_maya })
    check('request INTRO_BOOKED', afterYes.json?.request?.status === 'INTRO_BOOKED', afterYes.json?.request?.status)
    check('brandCompany present', afterYes.json?.request?.brandCompany === 'Doughmere Cookie Co.', afterYes.json?.request?.brandCompany)
    check('calls carry lastAeko/lastSupplier', afterYes.json?.calls?.every((c) => 'lastAeko' in c && 'lastSupplier' in c) && afterYes.json.calls.find((c) => c.id === stone.id)?.lastSupplier === 'Yes, we run a tunnel oven.', afterYes.json?.calls?.map((c) => [c.id, c.lastAeko, c.lastSupplier]))
    check('matches embedded with supplier', afterYes.json?.matches?.length >= 3 && afterYes.json.matches[0].supplier?.name, afterYes.json?.matches?.[0])

    const no = await call('POST', `/api/calls/${ridge.id}/outcome`, { token: tokens.usr_sup_ridgeline, body: { outcome: 'NO', reason: 'Rack ovens only', language: 'hi' } })
    check('outcome NO accepted', no.status === 200 && no.json?.call?.outcome === 'NO' && no.json?.call?.language === 'hi', no.json)

    const badOutcome = await call('POST', `/api/calls/${ridge.id}/outcome`, { token: tokens.usr_admin, body: { outcome: 'MAYBE' } })
    check('MAYBE valid', badOutcome.status === 200, badOutcome.json)

    const ended = await call('POST', `/api/calls/${wheat.id}/end`, { token: tokens.usr_admin })
    check('end without accept -> MISSED', ended.json?.call?.status === 'MISSED', ended.json)
    const getCall = await call('GET', `/api/calls/${stone.id}`, { token: tokens.usr_admin })
    check('getCall has events array', getCall.json?.events?.length === 2, getCall.json?.events?.length)
    check('getCall lastSupplier fallback', getCall.json?.call?.lastSupplier === 'Yes, we run a tunnel oven.', getCall.json?.call)
  }

  console.log('7. live endpoints + config + admin')
  {
    const ctx = await call('GET', `/api/live/context?callId=${calls.find((c) => c.supplierId === 'sup_stonefurrow').id}`, { token: tokens.usr_maya })
    check('context instruction built', ctx.status === 200 && ctx.json?.systemInstruction?.includes('Stonefurrow Crumb Co.') && ctx.json?.systemInstruction?.includes('500,000-unit stuffed cookies'), ctx.json?.systemInstruction?.slice(0, 120))
    const intake = await call('GET', '/api/live/context', { token: tokens.usr_maya })
    check('intake context', intake.status === 200 && intake.json?.request === null && intake.json?.supplier === null, intake.json)
    const tok = await call('POST', '/api/live/token', { token: tokens.usr_maya, body: { purpose: 'brand_intake' } })
    check('live token without keys -> 503 GEMINI_NOT_CONFIGURED', tok.status === 503 && tok.json?.error === 'GEMINI_NOT_CONFIGURED', tok.json)
    const badPurpose = await call('POST', '/api/live/token', { token: tokens.usr_maya, body: { purpose: 'nope' } })
    check('bad purpose 400', badPurpose.status === 400 && badPurpose.json?.error === 'INVALID_PURPOSE', badPurpose.json)

    const cfg = await call('GET', '/api/config', { token: tokens.usr_maya })
    check('config shape (null envs -> 500 CONFIG_MISSING)', cfg.status === 500 && cfg.json?.error === 'CONFIG_MISSING', cfg.json)

    const brandReset = await call('POST', '/api/admin/reset-demo', { token: tokens.usr_maya })
    check('brand cannot reset 403', brandReset.status === 403, brandReset.json)
    const adminReset = await call('POST', '/api/admin/reset-demo', { token: tokens.usr_admin })
    check('admin reset ok', adminReset.status === 200 && adminReset.json?.ok === true, adminReset.json)
    const after = await call('GET', '/api/calls/active', { token: tokens.usr_admin })
    check('reset cleared calls', after.json?.calls?.length === 0 && after.json?.request === null, after.json)

    const out = await call('POST', '/api/auth/logout', { token: tokens.usr_maya })
    check('logout ok', out.status === 200 && out.json?.ok === true, out.json)
    const meAfter = await call('GET', '/api/auth/me', { token: tokens.usr_maya })
    check('token dead after logout', meAfter.status === 401, meAfter.json)
  }

  console.log('8. misc routing')
  {
    const nf = await call('GET', '/api/nope/nope', { token: tokens.usr_admin })
    check('unknown path 404', nf.status === 404 && nf.json?.error === 'NOT_FOUND', nf.json)
    const wm = await call('DELETE', '/api/health')
    check('wrong method 405', wm.status === 405 && wm.json?.error === 'METHOD_NOT_ALLOWED', wm.json)
  }
} finally {
  server.close()
}

console.log(failures ? `\nSELFTEST FAILED: ${failures} check(s)` : '\nSELFTEST PASSED: all checks green')
process.exit(failures ? 1 : 0)
