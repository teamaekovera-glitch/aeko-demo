#!/usr/bin/env node
// §8 done-when checks against a live deployment.
// Usage: BASE_URL=https://aeko-demo.vercel.app node scripts/smoke.mjs
//   or:  node scripts/smoke.mjs https://aeko-demo.vercel.app
// Needs SUPABASE_URL/SERVICE_ROLE + GEMINI_API_KEY(S) configured on the target.
import { createClient } from '@supabase/supabase-js'

const BASE = (process.env.BASE_URL || process.argv[2] || 'http://localhost:3000').replace(/\/+$/, '')
const PASSWORD = 'aeko2026'

let failures = 0
let skips = 0
const allResponseText = []

function check(name, cond, extra) {
  if (cond) {
    console.log(`  PASS ${name}`)
    return true
  }
  failures++
  console.error(`  FAIL ${name}${extra !== undefined ? ` — ${JSON.stringify(extra).slice(0, 400)}` : ''}`)
  return false
}

function skip(name, why) {
  skips++
  console.log(`  SKIP ${name} — ${why}`)
}

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
  allResponseText.push(text)
  let jsonOut = null
  try { jsonOut = text ? JSON.parse(text) : null } catch { /* non-JSON */ }
  return { status: res.status, json: jsonOut, text }
}

async function main() {
  console.log(`Smoke against ${BASE}\n`)

  // 1. health names the working Gemini key
  console.log('1. health')
  {
    const r = await req('GET', '/api/health')
    check('health 200 + ok', r.status === 200 && r.json?.ok === true, r.json)
    check('db supabase', r.json?.db === 'supabase', r.json)
    check('geminiKey named (not none)', ['primary', 'secondary'].includes(r.json?.geminiKey), r.json)
  }

  // 2. all 5 users log in; wrong password 401
  console.log('2. auth')
  const tokens = {}
  {
    for (const email of ['maya@doughmere.demo', 'admin@aekovera.demo', 'ops@stonefurrow.demo', 'ops@ridgeline.demo', 'ops@wheatwind.demo']) {
      const r = await req('POST', '/api/auth/login', { body: { email, password: PASSWORD } })
      if (check(`login ${email}`, r.status === 200 && typeof r.json?.token === 'string', r.json)) tokens[email] = r.json.token
    }
    const bad = await req('POST', '/api/auth/login', { body: { email: 'maya@doughmere.demo', password: 'nope' } })
    check('wrong password 401', bad.status === 401 && bad.json?.error === 'INVALID_CREDENTIALS', bad.json)
  }
  const brand = tokens['maya@doughmere.demo']
  const admin = tokens['admin@aekovera.demo']
  const supTokens = { sup_stonefurrow: tokens['ops@stonefurrow.demo'], sup_ridgeline: tokens['ops@ridgeline.demo'], sup_wheatwind: tokens['ops@wheatwind.demo'] }

  // fresh slate
  const reset = await req('POST', '/api/admin/reset-demo', { token: admin })
  check('reset-demo ok', reset.status === 200 && reset.json?.ok === true, reset.json)

  // 3. parse the demo brief
  console.log('3. parse')
  let parsed
  {
    const r = await req('POST', '/api/requests/parse', {
      token: brand,
      body: { query: 'Stuffed cookies, 500,000 packs, tunnel oven, allergen-controlled line', language: 'en' },
    })
    check('parse 200', r.status === 200, r.json)
    parsed = r.json?.parsed
    check('category cookies', parsed?.category === 'cookies', parsed)
    check('volume 500000', parsed?.volume === 500000, parsed)
    check('specialty.equipment contains tunnel oven', parsed?.specialty?.equipment?.some((e) => String(e).toLowerCase().includes('tunnel oven')), parsed?.specialty)
    // "same result with Gemini disabled" is proven offline by `npm run selftest`
    // (the fallback parser runs whenever Gemini is unavailable).
  }

  // 4. create + match: live trio top 3
  console.log('4. create + match')
  let requestId
  {
    const c = await req('POST', '/api/requests', {
      token: brand,
      body: {
        rawQuery: 'Stuffed cookies, 500,000 packs, tunnel oven, allergen-controlled line',
        inputMode: 'text',
        language: 'en',
        ...parsed,
      },
    })
    check('create request 200', c.status === 200 && !!c.json?.request?.id, c.json)
    requestId = c.json?.request?.id

    const m = await req('POST', `/api/requests/${requestId}/match`, { token: brand })
    check('match 200', m.status === 200, m.json)
    const top3 = (m.json?.matches || []).slice(0, 3).map((x) => x.supplier.id)
    check('live trio top 3', JSON.stringify([...top3].sort()) === JSON.stringify(['sup_ridgeline', 'sup_stonefurrow', 'sup_wheatwind']), top3)
    check('scanned >= 25', (m.json?.scanned || 0) >= 25, m.json?.scanned)
  }

  // 5. calls create 3 RINGING; each supplier sees its own incoming
  console.log('5. calls')
  let calls
  {
    const c = await req('POST', `/api/requests/${requestId}/calls`, { token: brand, body: {} })
    calls = c.json?.calls || []
    check('3 RINGING calls', calls.length === 3 && calls.every((x) => x.status === 'RINGING'), calls.map((x) => x.status))
    for (const [sup, token] of Object.entries(supTokens)) {
      const inc = await req('GET', '/api/calls/incoming', { token })
      check(`incoming ${sup}`, inc.json?.call?.supplierId === sup && ['RINGING', 'CONNECTED'].includes(inc.json?.call?.status), inc.json)
    }
  }

  // 6. realtime: a call update reaches an anon-key postgres_changes subscription
  console.log('6. realtime')
  {
    const cfg = await req('GET', '/api/config', { token: admin })
    if (cfg.status !== 200 || !cfg.json?.supabaseUrl || !cfg.json?.supabaseAnonKey) {
      skip('realtime subscription', `/api/config unavailable (${cfg.status})`)
    } else {
      const sb = createClient(cfg.json.supabaseUrl, cfg.json.supabaseAnonKey, {
        realtime: { params: { eventsPerSecond: 10 } },
      })
      const stone = calls.find((c) => c.supplierId === 'sup_stonefurrow')
      let channel
      const got = new Promise((resolve, reject) => {
        channel = sb.channel('smoke-calls')
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'calls' }, (payload) => resolve(payload))
          .subscribe((status) => {
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') reject(new Error(`subscribe: ${status}`))
          })
        setTimeout(() => reject(new Error('realtime timeout (20s)')), 20_000)
      })
      try {
        const acc = await req('POST', `/api/calls/${stone.id}/accept`, { token: supTokens.sup_stonefurrow })
        check('supplier accept CONNECTED', acc.status === 200 && acc.json?.call?.status === 'CONNECTED', acc.json)
        const payload = await got
        check('realtime saw the call update', payload?.new?.id === stone.id, payload?.new?.id)
      } finally {
        if (channel) await sb.removeChannel(channel)
      }
    }
  }

  // 7. outcome YES -> INTRO_BOOKED
  console.log('7. outcome')
  {
    const stone = calls.find((c) => c.supplierId === 'sup_stonefurrow')
    const ridge = calls.find((c) => c.supplierId === 'sup_ridgeline')
    const wheat = calls.find((c) => c.supplierId === 'sup_wheatwind')

    const ev = await req('POST', `/api/calls/${stone.id}/events`, {
      token: supTokens.sup_stonefurrow,
      body: { kind: 'transcript', speaker: 'supplier', text: 'Yes — tunnel oven and a dedicated allergen room.' },
    })
    check('event ok', ev.status === 200 && ev.json?.ok === true, ev.json)

    const yes = await req('POST', `/api/calls/${stone.id}/outcome`, {
      token: supTokens.sup_stonefurrow,
      body: { outcome: 'YES', reason: 'Can run 500k, tunnel oven', language: 'en' },
    })
    check('outcome YES', yes.status === 200 && yes.json?.call?.outcome === 'YES' && yes.json?.call?.introSlot === 'Tue 10:00', yes.json)
    const detail = await req('GET', `/api/requests/${requestId}`, { token: brand })
    check('request INTRO_BOOKED', detail.json?.request?.status === 'INTRO_BOOKED', detail.json?.request?.status)
    check('brandCompany present', detail.json?.request?.brandCompany === 'Doughmere Cookie Co.', detail.json?.request?.brandCompany)
    check('calls carry lastAeko/lastSupplier', detail.json?.calls?.every((c) => 'lastAeko' in c && 'lastSupplier' in c), null)

    const no = await req('POST', `/api/calls/${ridge.id}/outcome`, { token: supTokens.sup_ridgeline, body: { outcome: 'NO', reason: 'Rack ovens only', language: 'hi' } })
    check('outcome NO', no.status === 200 && no.json?.call?.outcome === 'NO', no.json)
    const miss = await req('POST', `/api/calls/${wheat.id}/end`, { token: admin })
    check('end never-accepted -> MISSED', miss.json?.call?.status === 'MISSED', miss.json)
  }

  // 8. live token; key never appears in any response
  console.log('8. live token + key hygiene')
  {
    const r = await req('POST', '/api/live/token', { token: brand, body: { purpose: 'brand_intake' } })
    check('token returned', r.status === 200 && typeof r.json?.token === 'string' && r.json.token.length > 10, r.json)
    check('model + voice present', typeof r.json?.model === 'string' && typeof r.json?.voice === 'string', r.json)
    const ctx = await req('GET', `/api/live/context?callId=${calls[0].id}`, { token: brand })
    check('live/context built', ctx.status === 200 && String(ctx.json?.systemInstruction || '').includes('Aeko'), ctx.json?.systemInstruction?.slice(0, 100))
  }

  // 9. SPA + API on one deployment, one function
  console.log('9. hosting shape')
  {
    const home = await req('GET', '/')
    check('SPA served on /', home.status === 200 && /<div\s+id="root"/.test(home.text), home.text?.slice(0, 80))
    const nf = await req('GET', '/api/definitely-not-a-route')
    check('unknown API path 404 JSON', nf.status === 404 && nf.json?.error === 'NOT_FOUND', nf.json)
  }

  // key hygiene across every response we captured
  if (/AIza[0-9A-Za-z_-]{10,}/.test(allResponseText.join('\n'))) {
    failures++
    console.error('  FAIL key hygiene — a Google API key pattern appeared in a response')
  } else {
    console.log('  PASS key hygiene — no key material in any response')
  }

  console.log(`\n${failures ? `SMOKE FAILED: ${failures} failing check(s)` : 'SMOKE PASSED'}${skips ? ` (${skips} skipped)` : ''}`)
  process.exit(failures ? 1 : 0)
}

main().catch((e) => {
  console.error('smoke crashed:', e)
  process.exit(1)
})
