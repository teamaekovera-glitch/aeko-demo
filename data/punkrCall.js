// ---------------------------------------------------------------------------
// PUNKR live-call engine — the deterministic, keyless conversation core.
//
// Everything here is fictional and simulated locally: no real calls, no
// external APIs, no database. The demo of record is this scripted engine;
// every fact it speaks is either (a) asked of the user, or (b) read from the
// static supplier data in suppliers.js / the quote book in outreach.js.
//
// MODULARITY CONTRACT: the call is a list of SCENES. Each scene owns its own
// prompt, quick-answer chips, parser, and confirmation line. The runner walks
// the array in order — reordering, inserting, or removing scenes is an edit to
// this array, never a rewrite of the engine or the call UI.
// ---------------------------------------------------------------------------

import { suppliers as ALL_SUPPLIERS } from './suppliers.js'
import { QUOTE_BOOK } from './outreach.js'
import { COLD_OPEN, NAME_PARTS } from './coldOpen.js'

// The agent on the line.
export const PUNKR = {
  name: 'Aeko',
  title: 'Sourcing agent · Aekovera',
  number: '+1 (800) AEK-PROC',
}

// The customer on the other end of the line — the Myazon Foods buyer who
// placed the urgent order minutes ago. Aeko calls HER; the demo user plays
// her role. One persona, referenced everywhere the call appears.
export const CUSTOMER = {
  name: 'Stephanie Lang',
  first: 'Stephanie',
  title: 'Senior Sourcing Lead',
  company: 'Myazon Foods',
  placed: 'placed 4 minutes ago',
}

// The order of record for this demo scenario. Single source of truth — the
// client's retail purchase order: 500,000 units, shipments urgent. Every
// scene, chip, and line of supplier math reads its figures from here.
export const ORDER_CONTEXT = {
  label: 'Walmart private-label cookie order (fictional)',
  channel: 'Walmart · private-label program (fictional)',
  retailer: 'Walmart',
  story: 'the 500,000-unit Walmart cookie order',
  volume: 500000,
  volumeLabel: '500,000 units',
  urgency: 'urgent',
  urgencyNote: 'shipments flagged urgent — expedited review requested',
  placed: 'placed 4 minutes ago',
}

// ---------------------------------------------------------------------------
// Small pure parsing helpers. All tolerate messy spoken/typed input.
// ---------------------------------------------------------------------------

export const fmtInt = (n) => n.toLocaleString('en-US')

// "1.2M units / mo" → 1200000 · "800k units / mo" → 800000 · null if unparsable
export function parseCapacity(str) {
  if (!str) return null
  const m = str.replace(/,/g, '').match(/([\d.]+)\s*([mM]|[kK])?/)
  if (!m) return null
  const n = parseFloat(m[1])
  if (!Number.isFinite(n)) return null
  const scale = m[2]?.toLowerCase() === 'm' ? 1e6 : m[2]?.toLowerCase() === 'k' ? 1e3 : 1
  return Math.round(n * scale)
}

// "5,000 units" → 5000
export function parseMoqUnits(str) {
  if (!str) return null
  const m = str.replace(/,/g, '').match(/(\d+(?:\.\d+)?)/)
  return m ? Math.round(parseFloat(m[1])) : null
}

// "6-week lead" → 6 · "5–7 week lead" → 7 (use the pessimistic end)
export function parseLeadWeeks(str) {
  if (!str) return null
  const nums = [...str.matchAll(/(\d+)/g)].map((m) => Number(m[1]))
  return nums.length ? Math.max(...nums) : null
}

const NUMBER_WORDS = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, fifteen: 15,
  twenty: 20, twentyfive: 25, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100,
  thousand: 1e3, million: 1e6, 'half': 0.5, quarter: 0.25,
}

// Free-text volume → units. Handles "500,000", "500k", "0.5m", "half a
// million", "40 thousand". Returns null when nothing numeric is present.
export function parseVolume(text) {
  if (!text) return null
  const t = text.toLowerCase().replace(/,/g, '')
  if (/half\s+a?\s*million/.test(t)) return 500000
  if (/a\s+million/.test(t)) return 1000000
  const mil = t.match(/([\d.]+)\s*million/)
  if (mil) return Math.round(parseFloat(mil[1]) * 1e6)
  const km = t.match(/([\d.]+)\s*(k|m)\b/)
  if (km) {
    const n = parseFloat(km[1])
    if (Number.isFinite(n)) return Math.round(n * (km[2] === 'm' ? 1e6 : 1e3))
  }
  const bare = t.match(/([\d.]+)\s*(units?|pieces?|packs?|packets?)/)
  if (bare) {
    const n = parseFloat(bare[1])
    if (Number.isFinite(n)) return Math.round(n)
  }
  const plain = t.match(/([\d.]+)/)
  if (plain) {
    const n = parseFloat(plain[1])
    if (Number.isFinite(n) && n >= 100) return Math.round(n)
  }
  // Word forms: "forty thousand", "two hundred and fifty thousand"
  const words = t.split(/[^a-z]+/).filter(Boolean)
  let sum = 0
  let sawWord = false
  for (const w of words) {
    if (w === 'and') continue
    const v = NUMBER_WORDS[w]
    if (v == null) { if (sawWord) break; else continue }
    sawWord = true
    if (w === 'thousand' || w === 'million') sum = (sum || 1) * v
    else if (w === 'hundred') sum = (sum || 1) * 100
    else sum += v
  }
  return sawWord && sum >= 100 ? Math.round(sum) : null
}

// Fork answers — tolerant yes/no parse for the scripted quote fork.
export function parseYesNo(text) {
  const t = (text || '').toLowerCase()
  if (/\b(yes|yeah|yep|yup|sure|ok|okay|go ahead|go|do it|send|send it|fire|expedite|request it|please)\b/.test(t)) return 'yes'
  if (/\b(no|nah|nope|not now|hold|wait|adjust|rework|standard|later|don'?t|do not|negative)\b/.test(t)) return 'no'
  return null
}

// MOQ tolerance → { kind: 'flexible' | 'low' | 'max', max? }
export function parseMoqTolerance(text) {
  if (!text) return null
  const t = text.toLowerCase()
  if (/(low|small|minimum|little|start|pilot)/.test(t)) return { kind: 'low' }
  if (/(flex|any|no |not a|whatever|open|doesn'?t matter|fine)/.test(t)) return { kind: 'flexible' }
  const n = parseVolume(t)
  if (n) return { kind: 'max', max: n }
  return null
}

// Packaging → keyword token matched against supplier capabilities.
export function parsePackaging(text) {
  if (!text) return null
  const t = text.toLowerCase()
  if (/(glass|jar)/.test(t)) return { token: 'glass', label: 'Glass jars' }
  if (/(pet|plastic|bottle)/.test(t)) return { token: 'pet', label: 'PET bottles' }
  if (/(pouch|packet|sachet|stick|bag|flexible film)/.test(t)) return { token: 'pouch', label: 'Pouches / packets' }
  if (/(flexible|either|any|open|whatever|no preference)/.test(t)) return { token: null, label: 'Flexible' }
  return null
}

const MONTHS = ['january','february','march','april','may','june','july','august','september','october','november','december']

// Deadline → { weeks, label }. weeks=null when only a calendar marker is given.
export function parseDeadline(text) {
  if (!text) return null
  const t = text.toLowerCase()
  if (/(asap|urgent|immediately|right away|yesterday|now)/.test(t)) {
    return { weeks: 3, label: 'ASAP — urgent' }
  }
  const wk = t.match(/(\d+)\s*(weeks?|wks?)/)
  if (wk) {
    const weeks = Number(wk[1])
    return { weeks, label: `${weeks} week${weeks === 1 ? '' : 's'}` }
  }
  for (let i = 0; i < MONTHS.length; i++) {
    if (t.includes(MONTHS[i]) || t.includes(MONTHS[i].slice(0, 3))) {
      return { weeks: null, label: MONTHS[i][0].toUpperCase() + MONTHS[i].slice(1, 3) }
    }
  }
  const q = t.match(/q([1-4])/)
  if (q) return { weeks: null, label: `Q${q[1]}` }
  return null
}

// Product → keyword token matched against supplier capabilities.
export function parseProduct(text) {
  if (!text) return null
  const t = text.toLowerCase()
  if (/(cookie|biscuit|cracker|wafer)/.test(t)) return { token: 'pouch', label: 'Private-label cookies (packets)', adjacent: true }
  if (/(marinara|pasta|tomato|spaghetti|alfredo)/.test(t)) return { token: 'sauce', label: 'Pasta sauce', adjacent: false }
  if (/(salsa|picante|pico)/.test(t)) return { token: 'salsa', label: 'Salsa', adjacent: false }
  if (/(bbq|barbecue)/.test(t)) return { token: 'bbq', label: 'BBQ sauce', adjacent: false }
  if (/(dressing|vinaigrette|ranch)/.test(t)) return { token: 'dressing', label: 'Dressing', adjacent: false }
  if (/(marinade)/.test(t)) return { token: 'marinade', label: 'Marinade', adjacent: false }
  if (/(gravy)/.test(t)) return { token: 'gravy', label: 'Gravy', adjacent: false }
  if (/(sauce|hot sauce|ketchup|condiment)/.test(t)) return { token: 'sauce', label: 'Sauce', adjacent: false }
  return { token: null, label: text.trim().slice(0, 60), adjacent: false }
}

// ---------------------------------------------------------------------------
// The scene script. ORDER of the array IS the call order. Each scene:
//   id       — stable key
//   prompt   — (brief) => string[] lines PUNKR speaks & shows in transcript
//   chips    — quick answers so the live demo can be driven in one click
//   parse    — (text) => patch object | null (null → one gentle repair, then chips)
//   confirm  — (brief) => string[] acknowledgement lines
//   recover  — polite one-line bridge after an unclear answer; hands the
//              question back without re-asking the full prompt
// ---------------------------------------------------------------------------

export const SCENES = [
  {
    // Scale confirm — volume + MOQ stance in one answer. The product is the
    // story default (the Walmart cookie order Stephanie placed) and is never
    // asked; it is already on the brief when the call connects.
    id: 'scale',
    prompt: () => [
      `Quick confirm — how many units on the first run, and how flexible are we on supplier MOQs?`,
    ],
    chips: [
      '500,000 units · flexible on MOQ',
      '500,000 units · MOQ up to 10,000',
      '500,000 units · keep the MOQ low',
      '1 million units · flexible on MOQ',
    ],
    parse: (text) => {
      const t = (text || '').toLowerCase()
      const vol = parseVolume(t)
      let moq = null
      if (/(low|small|pilot)/.test(t)) moq = { kind: 'low' }
      else if (/(flex|any|open|whatever)/.test(t)) moq = { kind: 'flexible' }
      else {
        const upTo = t.match(/(?:up\s*to|max(?:imum)?)\s*([\d.,]+)\s*(k|m)?\b/)
        if (upTo) {
          const base = parseFloat(String(upTo[1]).replace(/,/g, ''))
          const n = Math.round(base * (upTo[2] === 'm' ? 1e6 : upTo[2] === 'k' ? 1e3 : 1))
          if (Number.isFinite(n) && n > 0) moq = { kind: 'max', max: n }
        }
      }
      if (vol == null && !moq) return null
      return {
        ...(vol != null ? { volume: vol } : {}),
        ...(moq ? { moqTolerance: moq } : {}),
      }
    },
    confirm: (brief) => [
      `Oh, I love this — ${fmtInt(brief.volume)} units.`,
      brief.moqTolerance.kind === 'low'
        ? 'Low MOQs on file — the small-run lines rank up.'
        : brief.moqTolerance.kind === 'max'
          ? `MOQs up to ${fmtInt(brief.moqTolerance.max)} — anything above that drops as the screen runs.`
          : 'Flexible on MOQs — that widens the field nicely.',
      `I'll find these manufacturers for you.`,
    ],
    confirmSpeak: (brief) =>
      `Oh, I love this — ${fmtInt(brief.volume)} units. I'll find these manufacturers for you.`,
    recover: {
      show: `No trouble — noted with thanks. Back to what I need: units on the first run, and how flexible we are on supplier MOQs.`,
      speak: `Noted, thank you. Back to it: how many units on the first run, and how flexible are we on MOQs?`,
    },
  },
  {
    // Spec confirm — packaging + deadline in one answer.
    id: 'spec',
    // No open-ended ask and no repeated "quick confirm" — the defaults go on
    // the record as bullets and the user confirms or corrects in one word.
    prompt: () => [
      `Last piece — two things on file:`,
      `• Packaging: retail-ready pouches.`,
      `• Landing: six weeks from PO.`,
      `If that's right, just say "go" — otherwise tell me what to change.`,
    ],
    chips: ['Pouches · 6 weeks', 'Pouches · ASAP', 'Glass jars · 6 weeks'],
    parse: (text) => {
      const t = (text || '').toLowerCase()
      const [pRaw, dRaw] = (text || '').split('·')
      const p = parsePackaging(pRaw || text)
      const d = parseDeadline((dRaw || '').trim())
      // A bare confirmation accepts the bullets as stated (the scripted
      // defaults — pouches, six weeks).
      if (!p && !d && /\b(go|yes|yeah|yep|yup|correct|confirmed|right|good|perfect|proceed|sounds good|that works|all good|do it)\b/.test(t)) {
        return { packaging: parsePackaging('pouches'), deadline: parseDeadline('6 weeks') }
      }
      if (!p && !d) return null
      return {
        ...(p ? { packaging: p } : {}),
        ...(d ? { deadline: d } : {}),
      }
    },
    confirm: (brief) => [
      `Perfect — ${brief.packaging?.label ?? 'format flexible'}, ${brief.deadline?.label ?? 'timeline open'}.`,
      `That's everything — the network is already working. Stay with me.`,
    ],
    confirmSpeak: (brief) =>
      `Perfect — ${brief.packaging?.label ?? 'format flexible'}, ${brief.deadline?.label ?? 'timeline open'}. That's everything — stay with me.`,
    recover: {
      show: `No trouble — noted. Still on the table: retail-ready pouches, landing six weeks from PO. Say "go" or tell me what to change.`,
      speak: `Noted, thank you. Back to it: pouches, landing in six weeks — say go, or tell me what to change.`,
    },
  },
]

export const EMPTY_BRIEF = {
  // The demo's default project — the Walmart private-label cookie order
  // Stephanie Lang placed — is on the brief before the call connects.
  product: { token: 'pouch', label: 'Private-label cookies (packets)', adjacent: true },
  volume: null,
  moqTolerance: null,
  packaging: null,
  deadline: null,
}

// ---------------------------------------------------------------------------
// Supplier math — deterministic scoring over the static supplier data.
// Every input is an existing fact (capability strings, MOQ, capacity, ratings,
// scripted quote book). Nothing here is invented.
// ---------------------------------------------------------------------------

const capText = (s) => s.capabilities.join(' | ').toLowerCase()

function capabilityHit(s, token) {
  if (!token) return false
  const hay = capText(s)
  if (token === 'sauce') return /(sauce|marinara|alfredo|ketchup|condiment)/.test(hay)
  return hay.includes(token)
}

// Rank suppliers against the gathered brief. Returns [{ supplier, score, reasons[] }].
export function rankSuppliers(brief, list = ALL_SUPPLIERS) {
  const volume = brief.volume ?? ORDER_CONTEXT.volume
  const strictMax = brief.moqTolerance?.kind === 'max' ? brief.moqTolerance.max : null

  return list
    .map((s) => {
      const moq = parseMoqUnits(s.moq)
      const capacity = parseCapacity(s.capacity)
      const reasons = []
      let score = s.match // existing discovery match score as the prior

      // Product fit — capability lines are the supplier's own recorded facts.
      if (capabilityHit(s, brief.product?.token)) {
        score += 30
        reasons.push(`${brief.product.label} lines on-site`)
      }

      // Packaging fit.
      if (brief.packaging?.token) {
        if (capabilityHit(s, brief.packaging.token)) {
          score += 15
          reasons.push(`${brief.packaging.label.toLowerCase()} capability`)
        }
      } else if (brief.packaging) {
        score += 5
      }

      // Volume vs monthly capacity — 500k-scale runs need real headroom.
      if (capacity != null) {
        if (capacity >= volume) {
          score += 22
          reasons.push(`capacity ${s.capacity.replace(' units / mo', '/mo')} covers the run`)
        } else if (capacity * 3 >= volume) {
          score += 8
          reasons.push(`staged runs — ${s.capacity.replace(' units / mo', '/mo')} monthly`)
        } else {
          score -= 30
          reasons.push('capacity shortfall vs order')
        }
      }

      // MOQ fit + tolerance weighting.
      if (moq != null) {
        if (moq <= volume) {
          score += 12
          reasons.push(`MOQ ${s.moq} cleared`)
          if (brief.moqTolerance?.kind === 'low') score += moq <= 5000 ? 10 : moq <= 8000 ? 6 : 2
        } else {
          score -= 18
          reasons.push(`MOQ ${s.moq} above first run`)
        }
        if (strictMax && moq > strictMax) {
          score -= 35
          reasons.push(`MOQ over the ${fmtInt(strictMax)} cap`)
        }
      }

      if (s.partner) reasons.push('Aekovera Partner')
      return { supplier: s, score, reasons }
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        (b.supplier.partner ? 1 : 0) - (a.supplier.partner ? 1 : 0) ||
        b.supplier.rating - a.supplier.rating ||
        a.supplier.name.localeCompare(b.supplier.name),
    )
}

// The quote of record for a supplier — read from the existing scripted quote
// book. Prices are quoted on the pilot basis; 500k-scale volume pricing is
// explicitly marked for re-quote (never invented here).
export function quoteFor(supplier, brief) {
  const q = QUOTE_BOOK[supplier.id] ?? null
  if (!q) return null
  const leadWeeks = parseLeadWeeks(q.lead)
  const deadlineWeeks = brief?.deadline?.weeks ?? null
  const volume = brief?.volume ?? ORDER_CONTEXT.volume
  return {
    ...q,
    supplier,
    leadWeeks,
    onTime: deadlineWeeks != null && leadWeeks != null ? leadWeeks <= deadlineWeeks : null,
    basis: `${q.terms}`,
    volumeNote:
      volume > 100000
        ? `Quoted on the pilot basis — ${fmtInt(volume)}-unit run goes back for volume re-quote`
        : 'Quoted for the stated run',
  }
}

// Urgency + lead-time check the agent speaks when the quote lands.
export function quoteFlags(quote, brief) {
  const flags = []
  if (quote.onTime === true) flags.push(`Lead time ${quote.lead.replace('-week lead', ' weeks')} makes the ${brief.deadline.label} window`)
  if (quote.onTime === false) flags.push(`Lead time ${quote.lead.replace('-week lead', ' weeks')} runs past the ${brief.deadline.label} ask — expedite requested`)
  if ((brief.volume ?? 0) >= ORDER_CONTEXT.volume) flags.push(ORDER_CONTEXT.urgencyNote)
  return flags
}

export const topMatches = (ranked, n = 3) => ranked.slice(0, n)

// A deterministic PO number in the app's existing AE-41xx style. AE-4116 is
// the story number of record for this demo scenario — the complete-circle
// summary and the wrap copy read from here.
export const poNumber = () => 'AE-4116'

// ---------------------------------------------------------------------------
// Live background feed — the supplier-side stream that runs WHILE Aeko talks.
//
// The outreach flow (emails, chats, voice touches, forms) is already firing
// from the moment the call connects; each of the customer's answers STEERS
// the running flow — narrowing the shortlist, retargeting packaging and
// freight — rather than triggering it. Waves are pure functions of the brief
// at that moment; the component appends them to its feed clock as answers
// land. Every fact below is read from the static fictional data (suppliers,
// quote book) or the cold-open story figures — nothing is invented at runtime.
// ---------------------------------------------------------------------------

// Fictional freight lanes of record — names from the cold-open logistics
// fleet, pinned transit days and rates. Deterministic; nothing computed live.
const FREIGHT_LANES = [
  { name: NAME_PARTS.logistics[1], days: 3, cost: 6180, mode: 'expedited reefer' },
  { name: NAME_PARTS.logistics[3], days: 5, cost: 4730, mode: 'dry van, team drivers' },
  { name: NAME_PARTS.logistics[5], days: 7, cost: 3540, mode: 'standard dry van' },
]

// Deterministic freight comparison for the deadline answer. The winner is the
// cheapest lane that lands inside the stated window (ASAP maps to 3 weeks).
export function freightCompare(deadline) {
  const windowDays = (deadline?.weeks ?? 3) * 7
  const lanes = FREIGHT_LANES.map((l) => ({ ...l, meets: l.days <= windowDays }))
  const winner = lanes.filter((l) => l.meets).sort((a, b) => a.cost - b.cost)[0]
  return lanes.map((l) => ({ ...l, isWinner: winner ? l.name === winner.name : false }))
}

const priorRanked = [...ALL_SUPPLIERS].sort((a, b) => b.match - a.match)

const dropReasonFor = (s, brief) => {
  const moq = parseMoqUnits(s.moq)
  const capacity = parseCapacity(s.capacity)
  const volume = brief.volume ?? ORDER_CONTEXT.volume
  if (brief.moqTolerance?.kind === 'max' && moq != null && moq > brief.moqTolerance.max) {
    return `MOQ ${s.moq} above the ${fmtInt(brief.moqTolerance.max)} cap`
  }
  if (capacity != null && capacity * 3 < volume) return 'capacity full for this window'
  if (moq != null && moq > volume) return `MOQ ${s.moq} above the run`
  return null
}

// One wave of background feed events, keyed to the answer that steered it.
// stage: 'open' | 'product' | 'volume' | 'moq' | 'packaging' | 'deadline'
// Returns [{ t, kind, title, detail, tone }] with t relative to the wave
// start (seconds); the component anchors waves to its live feed clock.
// Supplier-side pace — compressed ~30% so several threads visibly interleave
// while the call runs (brisk, not rushed). All wave timings scale at one exit.
const FEED_PACE = 0.7

export function callFeedWave(stage, brief, startT) {
  return buildCallFeedWave(stage, brief, startT).map((e) => ({
    ...e,
    t: startT + (e.t - startT) * FEED_PACE,
  }))
}

function buildCallFeedWave(stage, brief, startT) {
  const events = []
  const add = (t, kind, title, detail = '', tone = 'info') => {
    events.push({ t: startT + t, kind, title, detail, tone })
  }
  const volume = brief.volume ?? ORDER_CONTEXT.volume

  if (stage === 'open') {
    // The flow is ALREADY running before the first answer — scan + first pulls.
    add(0.4, 'scan', 'Network scan running', `${fmtInt(COLD_OPEN.funnel.scanned)} profiles · certification gate live`)
    priorRanked.slice(0, 3).forEach((s, i) => {
      add(1.6 + i * 1.1, 'shortlist', `Profile pulled · ${s.name}`, `${s.match}% prior · ${s.partner ? 'Aekovera Partner' : 'Community'} · MOQ ${s.moq}`)
    })
    add(5.4, 'chat', 'Chat line opened · Delta Sauce Co-Packers', 'Intro sent — reply pending')
    add(6.6, 'email', 'Email queued · Pacific Coast Provisions', 'Brief going out — drafting')
    return events
  }

  if (stage === 'scale') {
    // Volume + MOQ confirmed together — capacity screen and MOQ drops both
    // run, staggered so the rail reads as one continuous burst of work.
    return [
      ...buildCallFeedWave('volume', brief, startT),
      ...buildCallFeedWave('moq', brief, startT).map((e) => ({ ...e, t: e.t + 2.5 })),
    ]
  }

  if (stage === 'spec') {
    // Packaging + deadline confirmed together — packaging retarget first,
    // then the freight lanes quote against the window.
    return [
      ...buildCallFeedWave('packaging', brief, startT),
      ...buildCallFeedWave('deadline', brief, startT).map((e) => ({ ...e, t: e.t + 2.5 })),
    ]
  }

  if (stage === 'product' && brief.product) {
    const token = brief.product.token
    const fit = (s) => token != null && capabilityHit(s, token)
    add(0.3, 'note', `Brief updated · ${brief.product.label}`, 'Shortlist retargeted on the answer — flow keeps running')
    // Two spec-request emails go out to the new product-fit leaders.
    const fitTop = priorRanked.filter(fit).slice(0, 2)
    const ccTop = fitTop.length >= 2 ? fitTop : priorRanked.slice(0, 2)
    ccTop.forEach((s, i) => {
      add(1.2 + i * 1.2, 'email', `Spec request sent · ${s.name}`, `Subject lines on ${brief.product.label.toLowerCase()}`)
    })
    if (ccTop[0]) {
      add(4.2, 'reply', `Reply · ${ccTop[0].name}`, '“Lines are open — send the spec pack and we’ll turn it around.”')
    }
    // A non-fit supplier gracefully passes — pre-loaded, data-honest reason.
    // Picked from the tail of the book so it never contradicts the top-3
    // match board shown later on the call.
    const pass = [...priorRanked].reverse().find((s) => !fit(s))
    if (pass) {
      add(5.6, 'reject', `Passed · ${pass.name}`, `no ${brief.product.label.toLowerCase()} lines on-site — kept warm`, 'drop')
    }
    return events
  }

  if (stage === 'volume') {
    add(0.3, 'note', `Volume set · ${fmtInt(volume)} units`, 'Capacity screen running against every live line')
    const covers = priorRanked.filter((s) => (parseCapacity(s.capacity) ?? 0) >= volume).slice(0, 2)
    covers.forEach((s, i) => {
      add(1.4 + i * 1.2, 'shortlist', `Capacity confirmed · ${s.name}`, `${s.capacity} covers the run`)
    })
    const staged = priorRanked.filter((s) => {
      const cap = parseCapacity(s.capacity) ?? 0
      return cap < volume && cap * 3 >= volume
    })
    staged.slice(0, 2).forEach((s, i) => {
      add(4.2 + i * 1.1, 'drop', `Staged runs flagged · ${s.name}`, `${s.capacity} — multi-fill schedule needed`, 'warn')
    })
    return events
  }

  if (stage === 'moq') {
    add(0.3, 'note', 'MOQ screen live', 'Non-qualifying lines drop as the answers land')
    const drops = priorRanked.map((s) => [s, dropReasonFor(s, brief)]).filter(([, r]) => r != null)
    drops.slice(0, 3).forEach(([s, reason], i) => {
      add(1.2 + i * 1.2, 'reject', `Dropped · ${s.name}`, reason, 'drop')
    })
    if (brief.moqTolerance?.kind === 'low') {
      const small = priorRanked.filter((s) => (parseMoqUnits(s.moq) ?? 1e9) <= 5000)[0]
      if (small) add(4.6, 'shortlist', `Priority · ${small.name}`, `${small.moq} MOQ — small-run friendly, ranked up`)
    }
    if (drops.length === 0 && brief.moqTolerance?.kind !== 'low') {
      add(4.6, 'shortlist', 'Screen clean', 'All live MOQs clear the stated run — field holds')
    }
    return events
  }

  if (stage === 'packaging' && brief.packaging) {
    const token = brief.packaging.token
    add(0.3, 'note', token ? `Retarget · ${brief.packaging.label} lines` : 'Format flexible — field holds', 'Packaging-capable lines pulled forward')
    if (token) {
      const accepts = priorRanked
        .filter((s) => capabilityHit(s, token) && QUOTE_BOOK[s.id])
        .slice(0, 2)
      accepts.forEach((s, i) => {
        const q = QUOTE_BOOK[s.id]
        add(1.4 + i * 1.5, 'accept', `Accepted · ${s.name}`, `${q.price}/u pilot basis · ${q.lead} · ${s.certifications.slice(0, 3).join(', ')}`, 'ok')
      })
      const form = priorRanked.filter((s) => capabilityHit(s, token))[2]
      if (form) add(5.0, 'form', `Form submitted · ${form.name}`, 'Format, volume and certs auto-filled')
    }
    return events
  }

  if (stage === 'deadline' && brief.deadline) {
    add(0.3, 'note', `Deadline on the record · ${brief.deadline.label}`, 'Freight lanes quoting against the window')
    const lanes = freightCompare(brief.deadline)
    lanes.forEach((l, i) => {
      add(1.2 + i * 1.2, 'freight', `Freight · ${l.name}`, `$${fmtInt(l.cost)} · ${l.days}-day transit · ${l.mode}${l.isWinner ? ' — best rate for the window' : ''}`, l.isWinner ? 'ok' : 'info')
    })
    add(5.2, 'voice', 'Voice touch · Heartland Culinary Works', 'Brief delivered by voice — quote requested')
    if (brief.deadline.weeks != null && brief.deadline.weeks <= 4) {
      add(6.4, 'note', 'Expedite review opened', `Lead times checked hard against ${brief.deadline.label.toLowerCase()}`)
    }
    return events
  }

  return events
}

// ---------------------------------------------------------------------------
// The quote fork — a scripted yes/no decision the customer makes on the call.
// Both paths are pre-loaded and deterministic; neither dead-ends the demo.
// ---------------------------------------------------------------------------

export function forkFor(quote, brief) {
  const tension = quote?.onTime === false
  const lead = quote?.lead?.replace('-week lead', ' weeks') ?? 'six weeks'
  if (tension) {
    return {
      tension: true,
      chips: ['Yes — request expedite', 'No — standard schedule'],
      ask: `One decision before I send it — their first slot runs a ${lead} against your ${brief.deadline?.label ?? 'ASAP'} window. Want me to fire the expedite request?`,
      speak: `Quick yes-no for me — their slot runs past your window. Want the expedite request?`,
    }
  }
  return {
    tension: false,
    chips: ['Yes — send for acceptance', 'No — rework terms first'],
    ask: `Quote's inside your window — want me to send it to their operations desk for acceptance?`,
    speak: `Quote's inside your window. Send it for acceptance?`,
  }
}

// The scripted alternative for each fork answer — a YES proceeds as built,
// a NO routes to a graceful pre-loaded detour. Returns { show, speak, feed }.
export function forkBranch(answer, quote, brief) {
  const volume = fmtInt(brief.volume ?? ORDER_CONTEXT.volume)
  if (forkFor(quote, brief).tension) {
    if (answer === 'yes') {
      return {
        show: `Expedite's in — rush review opened with their ops desk and the ${FREIGHT_LANES[0].name} lane held for the first fill. Sending the quote for acceptance now.`,
        speak: `Expedite's in — sending it for acceptance now.`,
        feed: { kind: 'note', title: 'Expedite requested', detail: `${FREIGHT_LANES[0].name} lane held · rush review open`, tone: 'ok' },
      }
    }
    return {
      show: `Standard schedule locked — I've flagged the lead-time gap to your buyer and noted a staged first fill so the shelf is never empty while the run lands.`,
      speak: `Standard schedule it is — gap flagged to your buyer.`,
      feed: { kind: 'note', title: 'Standard schedule locked', detail: 'lead-time gap flagged · staged first fill noted', tone: 'warn' },
    }
  }
  if (answer === 'yes') {
    return {
      show: `Sent — their operations desk has the quote now.`,
      speak: `Sent — their ops desk has it.`,
      feed: { kind: 'note', title: 'Quote → ops desk', detail: 'acceptance requested on the quoted terms', tone: 'ok' },
    }
  }
  return {
    show: `Held — I took terms back to their desk instead of accepting as-is: a ${volume}-unit re-quote with a held production slot. Nothing was accepted without your go-ahead, and their rework lands on this line.`,
    speak: `Held — I reworked terms with their desk instead.`,
    feed: { kind: 'note', title: 'Terms rework requested', detail: `${volume}-unit re-quote · production slot held`, tone: 'warn' },
  }
}

// ---------------------------------------------------------------------------
// Complete-circle summary — the final recap built from THIS session's actual
// captured answers and the background feed the customer just watched run.
// ---------------------------------------------------------------------------

export function briefRowsFor(brief) {
  const rows = [
    ['Product', brief.product?.label],
    ['Volume', brief.volume ? `${fmtInt(brief.volume)} units` : null],
    ['MOQ stance', brief.moqTolerance
      ? brief.moqTolerance.kind === 'max'
        ? `Up to ${fmtInt(brief.moqTolerance.max)} units`
        : brief.moqTolerance.kind === 'low'
          ? 'Keep MOQs low'
          : 'Flexible'
      : null],
    ['Packaging', brief.packaging?.label],
    ['Deadline', brief.deadline?.label],
  ]
  return rows.filter(([, v]) => Boolean(v)).map(([k, v]) => ({ k, v }))
}

// Fold the feed events into the "what Aeko did" stats for the summary.
export function feedStatsFor(events) {
  const touched = new Set()
  const replies = new Set()
  const accepts = []
  const rejects = []
  let freight = []
  for (const e of events) {
    if (e.supplier && ['email', 'chat', 'voice', 'form', 'accept', 'reject', 'shortlist'].includes(e.kind)) touched.add(e.supplier)
    // accept/reject/quote events name their supplier in the title, not a
    // `supplier` field — count them too so the summary matches the montage.
    const named = e.title && (e.kind === 'accept' || e.kind === 'reject' || (e.kind === 'note' && /^Quote received · /.test(e.title)))
    if (named) {
      const nm = e.title.split('·').pop()?.trim()
      if (nm) touched.add(nm)
    }
    if (e.kind === 'reply' || e.kind === 'accept') {
      const name = e.title.split('·').pop()?.trim()
      if (name) replies.add(name)
    }
    if (e.kind === 'accept') accepts.push({ name: e.title.replace(/^Accepted · /, ''), detail: e.detail })
    if (e.kind === 'reject') rejects.push({ name: e.title.replace(/^Passed · /, '').replace(/^Dropped · /, ''), reason: e.detail })
    if (e.kind === 'freight') freight.push(e)
  }
  return { touched: touched.size, replies: replies.size, accepts, rejects, freight }
}

// ---------------------------------------------------------------------------
// Wrap-up copy builders — the closing beats after the last answer lands.
// ---------------------------------------------------------------------------

export function recapLine(brief) {
  const parts = []
  if (brief.product) parts.push(brief.product.label.toLowerCase())
  parts.push(`${fmtInt(brief.volume ?? ORDER_CONTEXT.volume)} units`)
  if (brief.packaging) parts.push(brief.packaging.label.toLowerCase())
  if (brief.deadline) parts.push(`landing ${brief.deadline.label.toLowerCase()}`)
  return `Recap before I run the match — ${parts.join(', ')}. ${brief.moqTolerance ? 'MOQ stance noted. ' : ''}That's the brief on the record.`
}

export function matchAnnouncement(brief, ranked) {
  const top = ranked[0]
  return `Running the network now… top match is ${top.supplier.name} — ${top.reasons.slice(0, 2).join(', ')}. I've requested the quote and flagged the order as ${ORDER_CONTEXT.urgency}.`
}
