// ---------------------------------------------------------------------------
// Storm run — the in-call montage's own timeline. Four parallel-activity
// beats woven into the four-supplier automated run:
//
//   1. LIVE CHATS · RUNNING IN PARALLEL — four tiles type questions into
//      their own threads at once, then take live replies (two yes, two no).
//   2. EMAILS · 100 SENT AT ONCE — an RFQ blast lands, the room waits, three
//      confirms come back in real time while one stays quiet.
//   3. CALLS · RINGING IN PARALLEL — four call cards ring together and
//      resolve out of order; the Heartland card books the tunnel-oven slot.
//   4. NO ANSWER · THE FORM GOES INSTEAD — rings go unanswered, so four
//      contact forms auto-fill themselves field by field and submit.
//
// The run closes with the SAME quotes/warm-intro tail the workspace script
// uses (buildQuotesTail), so the montage's digest and the call's complete-
// circle summary stay outcome-accurate to what the tiles show. Pure: list of
// suppliers in, flat timed step list out. Everything fictional, rendered
// locally — no real emails, calls, or forms are ever made.
// ---------------------------------------------------------------------------

import { buildQuotesTail } from './outreach.js'

// Beat lengths in seconds at 1× playback — the montage runs ~30s at the
// default pace (the overlay's montageSpeed math does the compression).
const BEAT = { chat: 5.6, email: 7.2, call: 6.0, forms: 7.4 }

// Tile stagger inside each beat (seconds at 1×) — small, so the tiles read
// as simultaneous, not queued.
const STAGGER = 0.15

// Parallel-chats copy: two green yes-answers, two red no-answers. Positions
// map to the montage list's rank order (partners first).
const CHAT_BEAT = [
  { q: 'Line open for a 500K pouch run?', reply: 'Open — tunnel ovens are free the week after next.', ok: true },
  { q: 'Food-grade certified?', reply: 'FDA + cGMP — certs are in the thread now.', ok: true },
  { q: 'MOQ workable at five thousand?', reply: 'Floor’s 12,000 on the pouch lines — can’t go under.', ok: false },
  { q: 'Three-week run — possible?', reply: 'Committed through Q4 — can’t stage it by then.', ok: false },
]

// Parallel-emails copy — one RFQ subject for the blast; confirms carry the
// minutes-to-reply. The fourth tile never answers.
const EMAIL_SUBJECT = 'RFQ 500K POUCHES'
const EMAIL_REPLIES = [
  { at: 3.0, mins: 3 },
  { at: 4.1, mins: 4 },
  { at: 5.2, mins: 6 },
]

// Overlapping-calls copy. The yes goes to Heartland (the tunnel-oven booking
// of record); the others resolve out of order — two quick passes, one maybe.
const CALL_COPY = {
  yes: { line: 'Yes — will do.', tag: 'Tunnel-oven slot booked' },
  maybe: { line: 'Maybe — I’d have to see the spec.', tag: 'Spec requested' },
  noRack: { line: 'Rack ovens only — and you’ll never find anyone that fast.', tag: 'Passed' },
  noCap: { line: 'We don’t have the capacity.', tag: 'Passed' },
}

// Forms-fallback copy — the unanswered rings, then the form fields that fill
// themselves in on every tile.
const FORM_RINGS = ['RING 1 · NO ANSWER', 'RING 2 · NO ANSWER', 'VOICEMAIL · FULL']
const FORM_FIELDS = [
  { label: 'Contact', value: 'Aeko · Aekovera Sourcing' },
  { label: 'Company', value: 'Aekovera — for Myazon Foods' },
  { label: 'Request', value: '500K cookie pouches' },
  { label: 'Deadline', value: '3 weeks' },
]

// The call card that books the run — Heartland on the demo path (the ranking
// puts it first); falls back to the top of the list for any other queue.
const heroSiFor = (list) => {
  const idx = list.findIndex((s) => s.id === 'heartland-culinary')
  return idx >= 0 ? idx : 0
}

export function buildStormScript(list) {
  const steps = []
  let t = 0
  const put = (si, kind, start, dur, data = null) => {
    steps.push({ id: steps.length, si, kind, start, dur, data })
  }

  // ---- Beat 1 · parallel live chats ----------------------------------------
  put(null, 'storm-chat-open', t, 0.2)
  const chatT0 = t
  const tiles = Math.min(4, list.length)
  for (let i = 0; i < tiles; i++) {
    const qAt = chatT0 + 0.9 + i * STAGGER
    const aAt = chatT0 + 2.8 + i * (STAGGER + 0.2)
    put(i, 'storm-chat-q', qAt, aAt - qAt, { q: CHAT_BEAT[i].q })
    put(i, 'storm-chat-a', aAt, chatT0 + BEAT.chat - aAt, { reply: CHAT_BEAT[i].reply, ok: CHAT_BEAT[i].ok })
  }
  t = chatT0 + BEAT.chat

  // ---- Beat 2 · parallel emails --------------------------------------------
  put(null, 'storm-email-open', t, 0.2)
  const emailT0 = t
  for (let i = 0; i < tiles; i++) {
    const sendAt = emailT0 + 0.3 + i * 0.12
    const reply = EMAIL_REPLIES[i] ?? null
    put(i, 'storm-email-send', sendAt, (reply ? reply.at : BEAT.email) - (sendAt - emailT0), {
      subject: EMAIL_SUBJECT,
    })
    if (reply) {
      const nextAt = EMAIL_REPLIES[i + 1]?.at ?? BEAT.email
      put(i, 'storm-email-reply', emailT0 + reply.at, nextAt - reply.at, { mins: reply.mins })
    }
  }
  t = emailT0 + BEAT.email

  // ---- Beat 3 · overlapping calls -------------------------------------------
  put(null, 'storm-call-open', t, 0.2)
  const callT0 = t
  const heroSi = heroSiFor(list)
  const others = list.map((_, i) => i).filter((i) => i !== heroSi)
  const callScript = [
    { si: others[1], at: 1.6, ...CALL_COPY.noRack, result: 'no' },
    { si: others[2], at: 2.2, ...CALL_COPY.noCap, result: 'no' },
    { si: others[0], at: 3.0, ...CALL_COPY.maybe, result: 'maybe' },
    { si: heroSi, at: 4.4, ...CALL_COPY.yes, result: 'yes' },
  ].filter((c) => c.si != null)
  callScript.forEach((c, i) => {
    const nextAt = callScript[i + 1]?.at ?? BEAT.call
    put(c.si, 'storm-call', callT0 + c.at, Math.max(0.4, nextAt - c.at), {
      result: c.result,
      line: c.line,
      tag: c.tag,
    })
  })
  t = callT0 + BEAT.call

  // ---- Beat 4 · forms fallback ----------------------------------------------
  put(null, 'storm-form-open', t, 0.2, { rings: FORM_RINGS })
  const formsT0 = t
  for (let i = 0; i < tiles; i++) {
    const at = 5.4 + i * STAGGER
    put(i, 'storm-form', formsT0 + at, BEAT.forms - at, { fields: FORM_FIELDS })
  }
  t = formsT0 + BEAT.forms

  // ---- Quotes & follow-ups + warm intros — the shared tail ------------------
  const tail = buildQuotesTail(list, t, steps.length)
  for (const step of tail) steps.push(step)
  const lastTail = tail[tail.length - 1]

  // foldCounts walks the list in start order (it breaks at the first future
  // step), so the montage timeline is sorted before it leaves here.
  steps.sort((a, b) => a.start - b.start || a.id - b.id)
  return { steps, total: lastTail ? lastTail.start + lastTail.dur : t }
}
