// Application core for the single catch-all Vercel function (api/[...path].js).
// createApp({ store }) lets tests inject an in-memory store; production uses the
// Supabase service client.
import { db } from './db.js'
import { makeStore } from './store.js'
import { ROUTES } from './routes.js'
import { matchRoute } from './router.js'
import { json, fail, readBody, newId, newToken, nowIso, toInt } from './json.js'
import { mapUser, mapSupplier, mapRequest, mapCall, mapMatch, mapEvent } from './mappers.js'
import { scoreSuppliers } from './matching.js'
import { supplierCallInstruction, brandIntakeInstruction } from './context.js'
import * as G from './gemini.js'

function httpError(status, code) {
  const err = new Error(code)
  err.status = status
  err.code = code
  return err
}

function canSeeRequest(user, request) {
  if (user.role === 'ADMIN') return true
  if (user.role === 'BRAND') return !!request && request.brand_user_id === user.id
  return false
}

function canTouchCall(user, call, request) {
  if (user.role === 'ADMIN') return true
  if (user.role === 'SUPPLIER') return !!user.supplier_id && user.supplier_id === call.supplier_id
  if (user.role === 'BRAND') return !!request && request.brand_user_id === user.id
  return false
}

async function loadSupplierMap(store) {
  const suppliers = await store.listSuppliers()
  return new Map(suppliers.map((s) => [s.id, s]))
}

// Adds Part B additions: lastAeko / lastSupplier (latest transcript text per speaker).
async function enrichCalls(store, callRows, supplierById, extraPerCall = {}) {
  const events = await store.listEventsForCalls(callRows.map((c) => c.id))
  const last = new Map()
  for (const e of events) {
    if (!e.text) continue
    const sp = String(e.speaker || '').toLowerCase()
    if (sp !== 'aeko' && sp !== 'supplier') continue
    if (!last.has(e.call_id)) last.set(e.call_id, {})
    last.get(e.call_id)[sp] = e.text
  }
  return callRows.map((c) =>
    mapCall(c, {
      lastAeko: last.get(c.id)?.aeko ?? null,
      lastSupplier: last.get(c.id)?.supplier ?? null,
      ...(extraPerCall[c.id] || {}),
    })
  )
}

const HANDLERS = {
  // ---------------------------------------------------------------- health --
  async health(ctx) {
    let ok = false
    let dbError
    try {
      ok = await ctx.store.ping()
    } catch (e) {
      dbError = String(e?.message || e).slice(0, 200)
    }
    const winner = await G.ensureKey() // 'primary' | 'secondary' | null
    json(ctx.res, 200, { ok, db: 'supabase', geminiKey: winner || 'none', ...(dbError ? { dbError } : {}) })
  },

  // ------------------------------------------------------------------ auth --
  async login(ctx) {
    const email = typeof ctx.body?.email === 'string' ? ctx.body.email.trim().toLowerCase() : ''
    const password = typeof ctx.body?.password === 'string' ? ctx.body.password : null
    if (!email || !password) return fail(ctx.res, 400, 'VALIDATION')
    const user = await ctx.store.getUserByEmail(email)
    if (!user || user.password !== password) return fail(ctx.res, 401, 'INVALID_CREDENTIALS')
    const token = newToken()
    await ctx.store.createSession(token, user.id)
    json(ctx.res, 200, { token, user: mapUser(user) })
  },

  async me(ctx) {
    json(ctx.res, 200, { user: mapUser(ctx.user) })
  },

  async logout(ctx) {
    await ctx.store.deleteSession(ctx.token)
    json(ctx.res, 200, { ok: true })
  },

  // -------------------------------------------------------------- requests --
  async parse(ctx) {
    const q = ctx.body?.query
    if (typeof q !== 'string' || !q.trim()) return fail(ctx.res, 400, 'VALIDATION')
    const parsed = await G.parseWithFallback(q, typeof ctx.body?.language === 'string' ? ctx.body.language : null)
    json(ctx.res, 200, { parsed })
  },

  async createRequest(ctx) {
    if (ctx.user.role === 'SUPPLIER') throw httpError(403, 'FORBIDDEN')
    const b = ctx.body || {}
    if (typeof b.rawQuery !== 'string' || !b.rawQuery.trim()) return fail(ctx.res, 400, 'VALIDATION')
    const row = {
      id: newId('req'),
      brand_user_id: ctx.user.id,
      raw_query: b.rawQuery,
      input_mode: typeof b.inputMode === 'string' ? b.inputMode : 'text',
      language: typeof b.language === 'string' ? b.language : null,
      category: typeof b.category === 'string' ? b.category : null,
      product: typeof b.product === 'string' ? b.product : null,
      volume: toInt(b.volume),
      moq: toInt(b.moq),
      specialty: b.specialty && typeof b.specialty === 'object' && !Array.isArray(b.specialty) ? b.specialty : {},
      search_terms: Array.isArray(b.searchTerms) ? b.searchTerms.map(String) : [],
      deadline: typeof b.deadline === 'string' ? b.deadline : null,
      status: 'NEW',
    }
    const created = await ctx.store.insertRequest(row)
    json(ctx.res, 200, { request: mapRequest(created) })
  },

  async listRequests(ctx) {
    if (ctx.user.role === 'SUPPLIER') throw httpError(403, 'FORBIDDEN')
    const brandUserId = ctx.user.role === 'BRAND' ? ctx.user.id : null
    const rows = await ctx.store.listRequests({ brandUserId })
    json(ctx.res, 200, { requests: rows.map((r) => mapRequest(r)) })
  },

  async getRequest(ctx) {
    const request = await ctx.store.getRequest(ctx.params.id)
    if (!request) throw httpError(404, 'NOT_FOUND')
    if (!canSeeRequest(ctx.user, request)) throw httpError(403, 'FORBIDDEN')

    const [brandUser, supplierById, matchRows, callRows] = await Promise.all([
      request.brand_user_id ? ctx.store.getUserById(request.brand_user_id) : Promise.resolve(null),
      loadSupplierMap(ctx.store),
      ctx.store.listMatchesForRequest(request.id),
      ctx.store.listCalls({ requestId: request.id }),
    ])

    const matches = matchRows.map((m) => ({ ...mapMatch(m), supplier: mapSupplier(supplierById.get(m.supplier_id)) }))
    const calls = await enrichCalls(ctx.store, callRows, supplierById, {
      ...Object.fromEntries(
        callRows.map((c) => [c.id, { request: mapRequest(request), supplier: mapSupplier(supplierById.get(c.supplier_id)) }])
      ),
    })

    json(ctx.res, 200, {
      request: mapRequest(request, { brandCompany: brandUser?.company ?? null }),
      matches,
      calls,
    })
  },

  async match(ctx) {
    const request = await ctx.store.getRequest(ctx.params.id)
    if (!request) throw httpError(404, 'NOT_FOUND')
    if (!canSeeRequest(ctx.user, request)) throw httpError(403, 'FORBIDDEN')

    const suppliers = await ctx.store.listSuppliers()
    const scored = scoreSuppliers({ ...mapRequest(request) }, suppliers)
    const top = scored.slice(0, 10)
    const rows = top.map((t, i) => ({
      id: newId('match'),
      request_id: request.id,
      supplier_id: t.supplier.id,
      score: t.score,
      reasons: t.reasons,
      rank: i + 1,
    }))
    await ctx.store.replaceMatches(request.id, rows)
    const updated = await ctx.store.updateRequest(request.id, { status: top.length ? 'MATCHING' : 'NO_MATCH' })

    json(ctx.res, 200, {
      request: mapRequest(updated),
      matches: top.map((t, i) => ({ ...mapMatch(rows[i]), supplier: mapSupplier(t.supplier) })),
      scanned: suppliers.length,
    })
  },

  async createCalls(ctx) {
    const request = await ctx.store.getRequest(ctx.params.id)
    if (!request) throw httpError(404, 'NOT_FOUND')
    if (!canSeeRequest(ctx.user, request)) throw httpError(403, 'FORBIDDEN')

    const b = ctx.body || {}
    let supplierIds = null
    if (b.supplierIds != null) {
      if (!Array.isArray(b.supplierIds) || !b.supplierIds.length || !b.supplierIds.every((x) => typeof x === 'string' && x.trim())) {
        return fail(ctx.res, 400, 'VALIDATION')
      }
      supplierIds = b.supplierIds.map((x) => x.trim())
    }

    const supplierById = await loadSupplierMap(ctx.store)
    if (!supplierIds) {
      // Default: live-demo suppliers among the matches (rank order).
      const matchRows = await ctx.store.listMatchesForRequest(request.id)
      supplierIds = matchRows
        .map((m) => supplierById.get(m.supplier_id))
        .filter((s) => s && s.is_live_demo)
        .map((s) => s.id)
    } else {
      const missing = supplierIds.filter((id) => !supplierById.has(id))
      if (missing.length) return fail(ctx.res, 400, 'VALIDATION')
    }

    if (!supplierIds.length) return json(ctx.res, 200, { calls: [] })

    const inserted = await ctx.store.insertCalls(
      supplierIds.map((sid) => ({ id: newId('call'), request_id: request.id, supplier_id: sid, status: 'RINGING' }))
    )
    const updated = await ctx.store.updateRequest(request.id, { status: 'CALLING' })

    json(ctx.res, 200, {
      calls: inserted.map((c) => mapCall(c, { supplier: mapSupplier(supplierById.get(c.supplier_id)), request: mapRequest(updated) })),
    })
  },

  // ----------------------------------------------------------------- calls --
  async incoming(ctx) {
    if (ctx.user.role !== 'SUPPLIER' || !ctx.user.supplier_id) throw httpError(403, 'FORBIDDEN')
    const [call] = await ctx.store.listCalls({ supplierId: ctx.user.supplier_id, statuses: ['RINGING', 'CONNECTED'], limit: 1 })
    if (!call) return json(ctx.res, 200, { call: null })
    const request = call.request_id ? await ctx.store.getRequest(call.request_id) : null
    const supplier = await ctx.store.getSupplier(call.supplier_id)
    json(ctx.res, 200, { call: mapCall(call, { request: mapRequest(request), supplier: mapSupplier(supplier) }) })
  },

  async active(ctx) {
    if (!['ADMIN', 'BRAND'].includes(ctx.user.role)) throw httpError(403, 'FORBIDDEN')
    const latest = await ctx.store.latestRequestByStatuses(['CALLING', 'INTRO_BOOKED'], ctx.user.role === 'BRAND' ? ctx.user.id : null)
    if (!latest) return json(ctx.res, 200, { calls: [], request: null })
    const callRows = await ctx.store.listCalls({ requestId: latest.id })
    const supplierById = await loadSupplierMap(ctx.store)
    const calls = await enrichCalls(ctx.store, callRows, supplierById, {
      ...Object.fromEntries(
        callRows.map((c) => [c.id, { request: mapRequest(latest), supplier: mapSupplier(supplierById.get(c.supplier_id)) }])
      ),
    })
    json(ctx.res, 200, { calls, request: mapRequest(latest) })
  },

  async getCall(ctx) {
    const call = await ctx.store.getCall(ctx.params.id)
    if (!call) throw httpError(404, 'NOT_FOUND')
    const request = call.request_id ? await ctx.store.getRequest(call.request_id) : null
    if (!canTouchCall(ctx.user, call, request)) throw httpError(403, 'FORBIDDEN')
    const [supplier, events] = await Promise.all([
      ctx.store.getSupplier(call.supplier_id),
      ctx.store.listEventsForCalls([call.id]),
    ])
    const lastAeko = [...events].reverse().find((e) => String(e.speaker || '').toLowerCase() === 'aeko' && e.text)
    const lastSupplier = [...events].reverse().find((e) => String(e.speaker || '').toLowerCase() === 'supplier' && e.text)
    json(ctx.res, 200, {
      call: mapCall(call, { lastAeko: lastAeko?.text ?? null, lastSupplier: lastSupplier?.text ?? null }),
      request: mapRequest(request),
      supplier: mapSupplier(supplier),
      events: events.map((e) => mapEvent(e)),
    })
  },

  async accept(ctx) {
    const call = await ctx.store.getCall(ctx.params.id)
    if (!call) throw httpError(404, 'NOT_FOUND')
    const request = call.request_id ? await ctx.store.getRequest(call.request_id) : null
    if (!canTouchCall(ctx.user, call, request)) throw httpError(403, 'FORBIDDEN')
    if (call.status === 'ENDED' || call.status === 'MISSED') throw httpError(409, 'CALL_ALREADY_ENDED')
    if (call.status === 'CONNECTED') return json(ctx.res, 200, { call: mapCall(call) }) // idempotent
    const updated = await ctx.store.updateCall(call.id, { status: 'CONNECTED', started_at: nowIso() })
    json(ctx.res, 200, { call: mapCall(updated) })
  },

  async addEvent(ctx) {
    const call = await ctx.store.getCall(ctx.params.id)
    if (!call) throw httpError(404, 'NOT_FOUND')
    const request = call.request_id ? await ctx.store.getRequest(call.request_id) : null
    if (!canTouchCall(ctx.user, call, request)) throw httpError(403, 'FORBIDDEN')
    const b = ctx.body || {}
    if (b.kind == null && b.speaker == null && b.text == null) return fail(ctx.res, 400, 'VALIDATION')
    await ctx.store.insertEvent({
      call_id: call.id,
      kind: b.kind ?? null,
      speaker: b.speaker ?? null,
      text: b.text ?? null,
      data: b.data ?? null,
    })
    json(ctx.res, 200, { ok: true })
  },

  async outcome(ctx) {
    const call = await ctx.store.getCall(ctx.params.id)
    if (!call) throw httpError(404, 'NOT_FOUND')
    const request = call.request_id ? await ctx.store.getRequest(call.request_id) : null
    if (!canTouchCall(ctx.user, call, request)) throw httpError(403, 'FORBIDDEN')
    const b = ctx.body || {}
    if (!['YES', 'NO', 'MAYBE'].includes(b.outcome)) return fail(ctx.res, 400, 'INVALID_OUTCOME')

    const patch = {
      outcome: b.outcome,
      outcome_reason: b.reason ?? null,
      language: b.language ?? call.language ?? null,
    }
    if (b.outcome === 'YES') {
      patch.intro_slot = 'Tue 10:00'
      if (call.request_id) await ctx.store.updateRequest(call.request_id, { status: 'INTRO_BOOKED' })
    }
    const updated = await ctx.store.updateCall(call.id, patch)
    json(ctx.res, 200, { call: mapCall(updated) })
  },

  async end(ctx) {
    const call = await ctx.store.getCall(ctx.params.id)
    if (!call) throw httpError(404, 'NOT_FOUND')
    const request = call.request_id ? await ctx.store.getRequest(call.request_id) : null
    if (!canTouchCall(ctx.user, call, request)) throw httpError(403, 'FORBIDDEN')
    let updated = call
    if (call.status === 'RINGING') {
      updated = await ctx.store.updateCall(call.id, { status: call.started_at ? 'ENDED' : 'MISSED', ended_at: nowIso() })
    } else if (call.status === 'CONNECTED') {
      updated = await ctx.store.updateCall(call.id, { status: 'ENDED', ended_at: nowIso() })
    } // already ENDED/MISSED → idempotent
    json(ctx.res, 200, { call: mapCall(updated) })
  },

  // ------------------------------------------------------------------ live --
  async liveToken(ctx) {
    const b = ctx.body || {}
    if (!['brand_intake', 'supplier_call'].includes(b.purpose)) return fail(ctx.res, 400, 'INVALID_PURPOSE')
    if (b.callId != null) {
      const call = await ctx.store.getCall(b.callId)
      if (!call) throw httpError(404, 'NOT_FOUND')
      const request = call.request_id ? await ctx.store.getRequest(call.request_id) : null
      if (!canTouchCall(ctx.user, call, request)) throw httpError(403, 'FORBIDDEN')
    }
    const token = await G.mintLiveToken() // throws 503 GEMINI_NOT_CONFIGURED / 502 GEMINI_UNAVAILABLE
    json(ctx.res, 200, {
      token,
      model: G.liveModel(),
      voice: G.voice(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    })
  },

  async tts(ctx) {
    const text = String(ctx.body?.text || '').trim()
    if (!text) return fail(ctx.res, 400, 'TEXT_REQUIRED')
    if (text.length > 600) return fail(ctx.res, 400, 'TEXT_TOO_LONG')
    const out = await G.synthesize(text)
    json(ctx.res, 200, { ...out, voice: G.voice(), model: G.ttsModel() })
  },

  async liveContext(ctx) {
    const callId = ctx.query.get('callId')
    if (!callId) {
      return json(ctx.res, 200, { systemInstruction: brandIntakeInstruction(), request: null, supplier: null })
    }
    const call = await ctx.store.getCall(callId)
    if (!call) throw httpError(404, 'NOT_FOUND')
    const request = call.request_id ? await ctx.store.getRequest(call.request_id) : null
    if (!canTouchCall(ctx.user, call, request)) throw httpError(403, 'FORBIDDEN')
    const [supplier, brandUser] = await Promise.all([
      ctx.store.getSupplier(call.supplier_id),
      request?.brand_user_id ? ctx.store.getUserById(request.brand_user_id) : Promise.resolve(null),
    ])
    json(ctx.res, 200, {
      systemInstruction: supplierCallInstruction({
        supplier: mapSupplier(supplier),
        request: mapRequest(request),
        brandCompany: brandUser?.company ?? null,
      }),
      request: mapRequest(request),
      supplier: mapSupplier(supplier),
    })
  },

  // ------------------------------------------------------------------ misc --
  async config(ctx) {
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseAnonKey) return fail(ctx.res, 500, 'CONFIG_MISSING')
    json(ctx.res, 200, { supabaseUrl, supabaseAnonKey })
  },

  async resetDemo(ctx) {
    if (ctx.user.role !== 'ADMIN') throw httpError(403, 'FORBIDDEN')
    await ctx.store.resetDemo()
    json(ctx.res, 200, { ok: true })
  },
}

export function createApp(overrides = {}) {
  return async function handler(req, res) {
    let url
    try {
      url = new URL(req.url || '/', 'http://localhost')
    } catch {
      return fail(res, 404, 'NOT_FOUND')
    }
    // vercel.json rewrites /api/* to the function at /api/handler with the
    // original subpath in the __route query param (bracket catch-all filenames
    // are not supported outside Next.js — they match only ONE segment). Direct
    // invocations without __route fall back to the plain pathname.
    const routeParam = url.searchParams.get('__route')
    const effectivePath = routeParam !== null
      ? `/api/${routeParam.replace(/^\/+/, '')}`
      : url.pathname
    const segs = effectivePath.split('/').filter(Boolean)
    if (segs[0] !== 'api') return fail(res, 404, 'NOT_FOUND')
    segs.shift()

    const method = (req.method || 'GET').toUpperCase()
    const m = matchRoute(ROUTES, segs, method)
    if (!m) {
      const anyMethod = matchRoute(ROUTES, segs, null)
      return fail(res, anyMethod ? 405 : 404, anyMethod ? 'METHOD_NOT_ALLOWED' : 'NOT_FOUND')
    }
    const { route, params } = m

    const dbClient = db()
    if (!overrides.store && !dbClient && route.handler !== 'health') return fail(res, 500, 'DB_NOT_CONFIGURED')
    const store = overrides.store || makeStore(dbClient)
    const ctx = { req, res, store, params, query: url.searchParams, body: {}, user: null, token: null }

    try {
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) ctx.body = await readBody(req)
      if (!route.public) {
        const header = req.headers?.authorization || ''
        const bearer = /^Bearer\s+(.+)$/i.exec(header)
        if (!bearer) return fail(res, 401, 'UNAUTHORIZED')
        ctx.token = bearer[1].trim()
        const user = await store.getUserByToken(ctx.token)
        if (!user) return fail(res, 401, 'UNAUTHORIZED')
        ctx.user = user
      }
      await HANDLERS[route.handler](ctx)
    } catch (e) {
      const status = e?.status || 500
      if (status >= 500) console.error(`[api] ${method} /api/${segs.join('/')}:`, e?.message || e)
      if (!res.headersSent) fail(res, status, e?.code || (status >= 500 ? 'INTERNAL' : 'ERROR'))
      else res.end()
    }
  }
}
