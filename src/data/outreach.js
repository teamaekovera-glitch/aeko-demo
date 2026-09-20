// ---------------------------------------------------------------------------
// Outreach simulation script. Everything here is fictional and rendered
// locally — no real emails, calls, or form submissions are ever made.
// The agent speaks like a human member of the sourcing team, and the story
// runs a three-way dynamic: agent ↔ supplier, agent ↔ client, and the relay
// between the two.
// ---------------------------------------------------------------------------

import { introShortlist, suppliers } from './suppliers.js'

export const BRAND_CONTEXT = {
  client: 'Olive & Ember',
  clientNote: 'fictional demo brand',
  briefPlaceholder: 'Sauce co-manufacturer',
  agent: { name: 'Dana Whitfield', title: 'Sourcing lead · Aekovera' },
  rows: [
    { label: 'Product', value: 'Organic tomato pasta sauce · hot-fill' },
    { label: 'Target volume', value: '40,000 units · first production run' },
    { label: 'Certifications', value: 'USDA Organic · SQF required' },
    { label: 'Packaging', value: '12 oz glass jars, screw-cap · private label' },
    { label: 'Price expectation', value: '$1.60–1.85 / unit, landed' },
  ],
}

// Founder-scripted conversation dynamics — exact lines, not to be paraphrased.
const GREAT_FIT =
  'Hey — this looks like a great fit for your lines. If the volumes work for you, I’ll connect you directly with the customer.'
const PASS_LINE =
  'No worries — the equipment’s a bit too specific for this run. I’ll keep you updated as new orders come through that match your lines.'
const RELAY_HOLD = 'Good question — let me check with the client on that and get back to you.'

// Step durations in seconds at 1× playback.
const DUR = {
  approve: 1.6,
  review: 0.7,
  chatMsg: 0.8,
  chatStatus: 1.1,
  clientCheck: 1.5,
  emailDraft: 1.0,
  emailSent: 0.7,
  call: 1.6,
  formFill: 1.2,
  formSubmit: 0.7,
  quote: 0.8,
  confirm: 1.3,
  followup: 0.8,
  pass: 1.0,
  warmIntro: 1.8,
  warmConnected: 1.4,
  gap: 0.4,
}

const AGENT_EMAIL = 'dana@aekovera.ai'
const SPEC_SHEET = 'Aekovera-Spec-Sheet-SAUCE-v1.pdf'

const SHORT_NAMES = {
  'heartland-culinary': 'Heartland',
  'pacific-coast-provisions': 'Pacific Coast',
  'delta-sauce-copackers': 'Delta',
  'lone-star-foods-mfg': 'Lone Star',
  'bayou-city-bottling': 'Bayou City',
  'cascade-fill-systems': 'Cascade',
  'keystone-culinary-group': 'Keystone',
  'sunbelt-cuisine-labs': 'Sunbelt',
  'new-england-pantry-copackers': 'New England',
  'garden-state-culinary': 'Garden State',
  'blue-ridge-packing': 'Blue Ridge',
  'gulf-coast-foods': 'Gulf Coast',
  'chesapeake-condiment-co': 'Chesapeake',
}

const shortName = (s) => SHORT_NAMES[s.id] ?? s.name.split(' ')[0]

const siteSlug = (s) => `${s.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com/contact`

// Fit tiers: 'great' (partners — warm intro + direct connect), 'good' (quote),
// 'pass' (graceful pass, no spec sent). Passes land on the tail of the queue.
// A targeted single-supplier run is brand-chosen, so it always plays the full
// storyline — a graceful pass would contradict the brand's explicit pick.
function fitTierFor(si, list) {
  if (list.length === 1) return list[0].partner ? 'great' : 'good'
  const passCount = Math.max(1, Math.round(list.length / 8))
  if (si >= list.length - passCount) return 'pass'
  if (list[si].partner) return 'great'
  return 'good'
}

// Every 4th supplier in the queue (not passes) asks a process question that
// needs the client's input — the agent relays it and comes back with an answer.
function relayTierFor(si, tier) {
  return tier !== 'pass' && si % 4 === 2
}

// ---------------------------------------------------------------------------
// Fictional per-supplier story content. Suppliers absent from this map fall
// back to generic (still supplier-specific) chat/call copy.
// ---------------------------------------------------------------------------

const STORY = {
  'heartland-culinary': {
    chat: [
      { role: 'agent', text: 'Hey Heartland team — I’m the sourcing lead over at Aekovera. I’m working with a brand called Olive & Ember on an organic hot-fill sauce, and your dedicated hot-fill lines are exactly what they’ve been hoping to find.' },
      { role: 'supplier', text: 'Hey, welcome! Hot-fill is our bread and butter — dedicated kettles at 1.2M units a month, USDA Organic and SQF on the certs.' },
      { role: 'agent', text: 'Love to hear it. First run is 40,000 units in 12 oz glass jars, private label — and your 5,000-unit MOQ gives the brand room to grow into the line.' },
      { role: 'supplier', text: 'Very doable. Label proofs in a week, production samples two weeks after that.' },
      { role: 'supplier', text: 'One thing — is the gold screw-cap finish a hard spec, or is there wiggle room on the closure?' },
      { role: 'agent', text: RELAY_HOLD },
    ],
    relay: {
      question: 'Heartland asks: is the gold screw-cap a hard spec, or is there wiggle room on the closure?',
      answer: 'Olive & Ember: “Gold is what the label was drawn around — keep it for the launch. We’ll happily look at alternates from run two.”',
      relayBack: 'Good news — gold stays for the launch since the label was drawn around it. They’ll happily review alternates from run two, though. I’ve noted it on the spec.',
    },
    chatTail: [
      { role: 'agent', text: 'I’ll send the full spec sheet to your inbox right now. Any chance we could see a quote this week?' },
      { role: 'supplier', text: 'You’ll have it within 48 hours — I’ve already flagged the kettle slot.' },
      { role: 'agent', text: GREAT_FIT },
    ],
    call: {
      duration: '2m 14s',
      tag: 'Quote requested',
      highlights: [
        { who: 'Agent', text: 'Walked the spec sheet line by line — jars, labels, fill temps.' },
        { who: 'Supplier', text: 'Confirmed organic kettle availability for a Q4 start.' },
      ],
    },
    quote: { price: '$1.78', lead: '6-week lead', terms: 'FOB Indianapolis · 40k units' },
    confirm: {
      highlights: [
        { who: 'Aekovera team', text: 'Pilot run locked for Olive & Ember’s Q4 reset — spec sheet signed.' },
        { who: 'Heartland', text: 'Confirmed on our side — PO to follow this week, samples ship Friday.' },
      ],
    },
  },

  'pacific-coast-provisions': {
    chat: [
      { role: 'agent', text: 'Hi Pacific Coast team — I’m with Aekovera’s sourcing desk. Olive & Ember needs glass-bottle hot-fill at 40k units, and your Portland line is the closest spec match I’ve seen all week.' },
      { role: 'supplier', text: 'Hi! Glass hot-fill is our core — shelf-stable sauces in glass and PET, SQF certified.' },
      { role: 'agent', text: 'The brand runs USDA Organic — is that on your current certs?' },
      { role: 'supplier', text: 'Yes — organic-certified kettles too. At a 10,000-unit MOQ we could stage the whole first run inside a week.' },
      { role: 'supplier', text: 'Do you know if the client wants to supply their own glass, or would we source the jars?' },
      { role: 'agent', text: RELAY_HOLD },
    ],
    relay: {
      question: 'Pacific Coast asks: does the brand want to supply its own glass, or should the co-man source it?',
      answer: 'Olive & Ember: “Source through the co-man — we care about the jar spec, not the supplier.”',
      relayBack: 'Back with an answer — they’re happy for you to source the glass as long as the 12 oz flint spec holds. I’ll attach the jar drawing to the spec pack.',
    },
    chatTail: [
      { role: 'agent', text: 'Wonderful — spec sheet incoming. Could we get a quote this week?' },
      { role: 'supplier', text: 'Within 48 hours, guaranteed.' },
      { role: 'agent', text: GREAT_FIT },
    ],
    call: {
      duration: '2m 38s',
      tag: 'Capacity confirmed',
      highlights: [
        { who: 'Agent', text: 'Reviewed glass sourcing — 12 oz flint jars, screw-cap finish.' },
        { who: 'Supplier', text: 'Held a one-week production slot pending the PO.' },
      ],
    },
    quote: { price: '$1.84', lead: '7-week lead', terms: 'FOB Portland · 40k units' },
    confirm: {
      highlights: [
        { who: 'Aekovera team', text: 'Glass sourcing and an organic kettle slot are held for the first run.' },
        { who: 'Pacific Coast', text: 'Confirmed — scheduling the line for week 7.' },
      ],
    },
  },

  'delta-sauce-copackers': {
    chat: [
      { role: 'agent', text: 'Hey Delta team — Aekovera sourcing desk here. I’m comparing co-packers for Olive & Ember’s organic sauce launch, and your spouted-pouch line plus that 3,500-unit MOQ stood out immediately.' },
      { role: 'supplier', text: 'Happy you called! Organic plus low MOQ is our sweet spot — most brands pilot their very first run with us.' },
      { role: 'supplier', text: 'Out of curiosity — is the client married to glass, or would a pouch pilot run be interesting before they commit to jars?' },
      { role: 'agent', text: RELAY_HOLD },
    ],
    relay: {
      question: 'Delta asks: would the brand consider a pouch pilot before the glass run?',
      answer: 'Olive & Ember: “A small pouch pilot is a great instinct — let’s price both.”',
      relayBack: 'Back with an answer — they love the instinct. Price the pouch pilot alongside the glass run and I’ll make sure both land on their desk.',
    },
    chatTail: [
      { role: 'agent', text: 'Spec sheet is on its way — could you quote both formats this week?' },
      { role: 'supplier', text: 'Both quotes inside 48 hours.' },
      { role: 'agent', text: GREAT_FIT },
    ],
    call: {
      duration: '1m 57s',
      tag: 'Organic line verified',
      highlights: [
        { who: 'Agent', text: 'Verified organic handling and seal-integrity specs.' },
        { who: 'Supplier', text: 'Offered a 3,500-unit pilot ahead of the 40k run.' },
      ],
    },
    quote: { price: '$1.69', lead: '5-week lead', terms: 'FOB Memphis · 40k units' },
  },

  'lone-star-foods-mfg': {
    chat: [
      { role: 'agent', text: 'Hi Lone Star team — I’m the sourcing lead at Aekovera. Olive & Ember’s brief is organic hot-fill now, with a possible aseptic scale-up next year — and your Dallas plant covers both without a line change.' },
      { role: 'supplier', text: 'Correct — hot-fill and aseptic run side by side here, so the brand could scale without retooling.' },
      { role: 'agent', text: 'That’s exactly the flexibility they’re after. Specs are headed to your inbox.' },
      { role: 'supplier', text: 'Watch for our quote — we’re sharp on 8,000-plus organic runs.' },
      { role: 'agent', text: GREAT_FIT },
    ],
    call: {
      duration: '2m 21s',
      tag: 'Quote requested',
      highlights: [
        { who: 'Agent', text: 'Discussed the aseptic upgrade path for year-two volume.' },
        { who: 'Supplier', text: 'Flagged Q4 kettle availability — Q1 opens wider.' },
      ],
    },
    quote: { price: '$1.81', lead: '6-week lead', terms: 'FOB Dallas · 40k units' },
  },

  'bayou-city-bottling': {
    chat: [
      { role: 'agent', text: 'Hey Bayou City team — Aekovera sourcing desk. Working a 40k-unit hot-fill sauce run in 12 oz glass for a brand called Olive & Ember — your glass-bottling line caught my eye.' },
      { role: 'supplier', text: 'Hi! We bottle hot sauce and salsa all day — FDA and cGMP certified, 6,000-unit MOQ.' },
      { role: 'agent', text: 'Great fit on volume. Sending the spec sheet now — could you quote this week?' },
      { role: 'supplier', text: '48 hours from specs to quote, standard.' },
    ],
    call: {
      duration: '1m 48s',
      tag: 'Specs shared',
      highlights: [
        { who: 'Agent', text: 'Shared glass-bottle specs and the label dieline.' },
        { who: 'Supplier', text: 'Asked for the organic cert copy — sent in-thread.' },
      ],
    },
    quote: { price: '$1.83', lead: '6-week lead', terms: 'FOB Houston · 40k units' },
  },

  'cascade-fill-systems': {
    chat: [
      { role: 'agent', text: 'Hi Cascade team — Aekovera sourcing desk here. Your refrigerated lines are interesting for a chilled SKU variant Olive & Ember is noodling on.' },
      { role: 'supplier', text: 'We run cold-fill dressings and refrigerated sauces — Organic certified, 12,000-unit MOQ.' },
      { role: 'agent', text: 'Noted for the chilled extension — the core launch is hot-fill, but I didn’t want to lose your number. Full brief is in your email.' },
      { role: 'supplier', text: 'Got it — we’ll take a look and come back with numbers.' },
    ],
    call: {
      duration: '2m 02s',
      tag: 'Quote requested',
      highlights: [
        { who: 'Agent', text: 'Walked through chilled-variant logistics.' },
        { who: 'Supplier', text: 'Checking refrigerated rack space for the extension SKU.' },
      ],
    },
    quote: { price: '$1.88', lead: '7-week lead', terms: 'FOB Boise · chilled extension' },
  },

  'keystone-culinary-group': {
    chat: [
      { role: 'agent', text: 'Hi Keystone team — I’m the sourcing lead at Aekovera. I’ve got an organic sauce brief that fits your slow-simmer retail lines to a tee — 40k units, 12 oz glass. Sending details by email and your web form now.' },
      { role: 'status', text: 'Delivered · reply pending' },
    ],
    call: {
      duration: '1m 36s',
      tag: 'Brief delivered',
      highlights: [
        { who: 'Agent', text: 'Left a detailed voicemail and sent the spec sheet by email.' },
      ],
    },
    followup: { when: '+48h', text: 'Auto follow-up: re-send the brief, then call the main line.' },
  },

  'sunbelt-cuisine-labs': {
    chat: [
      { role: 'agent', text: 'Hey Sunbelt team — Aekovera sourcing desk. Private-label sauce run for Olive & Ember: 40k units, organic hot-fill. Your flexible short runs made the shortlist — full brief by email.' },
      { role: 'status', text: 'Delivered · reply pending' },
    ],
    call: {
      duration: '1m 29s',
      tag: 'Brief delivered',
      highlights: [
        { who: 'Agent', text: 'Spoke with the front desk — brief routed to the ops mailbox.' },
      ],
    },
    followup: { when: '+48h', text: 'Auto follow-up: re-send the brief, then call the main line.' },
  },
}

// Relay exchange for suppliers without a scripted one — generic but concrete.
const GENERIC_RELAY = {
  question: (s) => `${shortName(s)} asks: is the client locked on glass, or open to PET if supply tightens?`,
  answer: 'Olive & Ember: “Glass preferred for the launch — PET is fine from run two if pricing holds.”',
  relayBack: 'Back with an answer — glass is preferred for the launch, and they’re open to PET from run two if pricing holds. I’ll note it in the spec pack.',
}

function genericChat(s, tier) {
  const cap = s.capabilities[0].toLowerCase()
  if (tier === 'pass') {
    return [
      { role: 'agent', text: `Hey ${shortName(s)} team — I’m the sourcing lead over at Aekovera, working an organic hot-fill sauce brief for a brand called Olive & Ember. Your ${cap} line-up made the long list.` },
      { role: 'supplier', text: `Hi, thanks for reaching out! Happy to take a look — ${s.certifications.join(' + ')} certified, MOQ ${s.moq}.` },
      { role: 'agent', text: `So I dug into your line-up against the spec — and honestly, your kit runs more specialized than this particular run needs. Rather than waste your kettle time, I wanted to be straight with you.` },
      { role: 'supplier', text: 'Appreciate you looking at it properly — most brokers wouldn’t bother.' },
      { role: 'agent', text: PASS_LINE },
    ]
  }
  return [
    { role: 'agent', text: `Hey ${shortName(s)} team — I’m the sourcing lead over at Aekovera. I’m working with a brand called Olive & Ember on an organic hot-fill sauce, and your ${cap} line-up made the shortlist.` },
    { role: 'supplier', text: `Hey, thanks for reaching out! Right in our wheelhouse — ${s.certifications.join(' + ')} certified, MOQ ${s.moq}.` },
    { role: 'agent', text: 'Glad to hear it. First run is 40,000 units in 12 oz glass jars, private label — the full spec sheet is headed to your inbox.' },
    { role: 'supplier', text: 'Perfect — send it over and we’ll turn a quote around fast.' },
  ]
}

function genericCall(s, tier) {
  return {
    duration: '2m 02s',
    tag: tier === 'pass' ? 'Fit check' : 'Specs shared',
    highlights: [
      { who: 'Agent', text: 'Walked through the brand brief and spec sheet.' },
      { who: 'Supplier', text: `Confirmed ${s.certifications[0]} handling and current capacity.` },
    ],
  }
}

function storyFor(s, tier) {
  const overrides = STORY[s.id] ?? {}
  const chatHead = overrides.chat ?? genericChat(s, tier)
  // Scripted stories manage their own tails; generic ones close with the
  // great-fit line (never for passes, and not for suppliers who never reply).
  const chatTail =
    overrides.chatTail ??
    (overrides.chat || tier === 'pass' ? null : [{ role: 'agent', text: GREAT_FIT }])
  return {
    chatHead,
    relay: overrides.relay,
    chatTail,
    call: overrides.call ?? genericCall(s, tier),
    quote: overrides.quote,
    confirm: overrides.confirm,
    followup: overrides.followup,
  }
}

function emailFor(s) {
  return {
    to: `sourcing@${s.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
    from: AGENT_EMAIL,
    subject: 'Aekovera intro: organic hot-fill sauce · 40k units · 12 oz glass',
    body: [
      `Hi ${shortName(s)} team,`,
      'I’m the sourcing lead at Aekovera — great chatting with you today. As promised, here’s the full brief from Olive & Ember, a brand launching an organic, hot-fill pasta sauce. First run: 40,000 units, 12 oz glass jars, private label. USDA Organic and SQF required.',
      `Your ${s.capabilities[0].toLowerCase()} capability — plus a ${s.moq} MOQ and ${s.capacity} capacity — is exactly why the brand asked me to reach out. Could you quote the first run and share your earliest production window?`,
      'Full spec sheet attached. Reply here or on the chat line, whichever is easier.',
      `— ${BRAND_CONTEXT.agent.name} · Sourcing, Aekovera (for Olive & Ember)`,
    ],
    attachment: SPEC_SHEET,
  }
}

function formFor(s) {
  return {
    url: siteSlug(s),
    fields: [
      { label: 'Name', value: `${BRAND_CONTEXT.agent.name} · Aekovera` },
      { label: 'Email', value: AGENT_EMAIL },
      {
        label: 'Project specs',
        value: '40,000 units · organic hot-fill pasta sauce · 12 oz glass jars, private label · USDA Organic + SQF · target $1.60–1.85/unit landed',
        long: true,
      },
    ],
  }
}

// ---------------------------------------------------------------------------
// Script builder — pure: list of suppliers in, flat timed step list out.
//
// Steps are emitted CHANNEL-MAJOR (every supplier's chat, then every email,
// then every call, then forms, then quotes/follow-ups/passes, then the warm
// intros) so each channel owns one contiguous slice of the timeline — that is
// what lets the workspace auto-transition between full-height screens.
// ---------------------------------------------------------------------------

export function buildScript(list) {
  const steps = []
  let t = 0
  const add = (si, kind, data = null) => {
    steps.push({ id: steps.length, si, kind, start: t, dur: DUR[kind] ?? 1, data })
    t += DUR[kind] ?? 1
  }

  const plans = list.map((supplier, si) => ({
    supplier,
    si,
    tier: fitTierFor(si, list),
    story: storyFor(supplier, fitTierFor(si, list)),
  }))

  // Plan approved — the click-to-action moment before the agent starts.
  add(null, 'approve', { count: list.length })

  // ---- Live chat: review every profile, open every thread -----------------
  plans.forEach(({ supplier, si, tier, story }, pi) => {
    if (pi > 0) add(si, 'gap')
    add(si, 'review')

    // Head of the conversation (may end mid-thread with a relay question).
    for (const msg of story.chatHead) {
      add(si, msg.role === 'status' ? 'chat-status' : 'chat-msg', msg)
    }

    // Relay dynamic: supplier question → client check-in → answer relayed back.
    // Only suppliers actively replying in-thread get the relay beat.
    const hasSupplierReply = story.chatHead.some((m) => m.role === 'supplier')
    if (tier !== 'pass' && hasSupplierReply && relayTierFor(si, tier)) {
      const relay = story.relay ?? {
        question: GENERIC_RELAY.question(supplier),
        answer: GENERIC_RELAY.answer,
        relayBack: GENERIC_RELAY.relayBack,
      }
      add(si, 'client-check', relay)
      const tail = story.chatTail ?? []
      const relayMsg = tail.find((m) => m.role === 'agent' && m.text.startsWith('Back with an answer'))
      const rest = tail.filter((m) => m !== relayMsg)
      if (relayMsg) add(si, 'chat-msg', relayMsg)
      for (const msg of rest) add(si, msg.role === 'status' ? 'chat-status' : 'chat-msg', msg)
    } else {
      for (const msg of story.chatTail ?? []) {
        add(si, msg.role === 'status' ? 'chat-status' : 'chat-msg', msg)
      }
    }
  })

  const active = plans.filter(({ tier }) => tier !== 'pass')

  // ---- Drafted email: spec sheets out to every active supplier ------------
  for (const { supplier, si } of active) {
    const email = emailFor(supplier)
    add(si, 'email-draft', email)
    add(si, 'email-sent', email)
  }

  // ---- AI voice calls ------------------------------------------------------
  for (const { si, story } of active) {
    add(si, 'call', story.call)
  }

  // ---- Web forms -----------------------------------------------------------
  for (const { supplier, si } of active) {
    add(si, 'form-fill', formFor(supplier))
    add(si, 'form-submitted')
  }

  // ---- Quotes & follow-ups (passes resolve here too) ----------------------
  for (const { si, tier, story } of plans) {
    if (tier === 'pass') {
      add(si, 'pass', { line: PASS_LINE })
      continue
    }
    if (story.quote) add(si, 'quote', story.quote)
    if (story.confirm) add(si, 'confirm', story.confirm)
    if (story.followup) add(si, 'followup', story.followup)
  }

  // ---- Warm introductions — the brand meets its top-fit suppliers ---------
  list.slice(0, Math.min(2, list.length)).forEach((s) => {
    // Suppliers whose storyline produced no quote (reply-pending or unscripted
    // community matches) get copy that doesn't lean on a quote.
    const quoted = steps.some((st) => st.si === list.indexOf(s) && st.kind === 'quote')
    const data = {
      supplierName: s.name,
      short: shortName(s),
      message: quoted
        ? `Hi ${shortName(s)} — meet Olive & Ember, the brand behind the sauce brief you quoted. They loved your quote and how the conversations went — here’s a direct line to say hello.`
        : `Hi ${shortName(s)} — meet Olive & Ember, the brand behind the sauce brief. They liked how the conversations went — here’s a direct line to say hello.`,
      reply: quoted
        ? 'Wonderful — hi Olive & Ember! The kettle slot’s penciled in. Let’s get samples moving — we’ll send label proofs this week.'
        : 'Wonderful — hi Olive & Ember! Great to connect directly. Send the spec pack over and we’ll come back with a production window.',
      connected: `Connected: Olive & Ember ↔ ${s.name} · Intro delivered · Thread opened`,
    }
    add(null, 'warm-intro', data)
    add(null, 'warm-connected', data)
  })

  return { steps, total: t }
}

const TOUCH_KINDS = new Set(['chat-msg', 'email-sent', 'form-submitted', 'call', 'quote', 'confirm'])

// Live counters derived from elapsed time — the summary ticks up as events fire.
export function foldCounts(steps, elapsed) {
  const counts = { contacted: 0, replies: 0, quotes: 0, confirmed: 0 }
  const touched = new Set()
  const replied = new Set()
  for (const step of steps) {
    if (step.start > elapsed) break
    if (step.si != null && TOUCH_KINDS.has(step.kind)) touched.add(step.si)
    if (step.kind === 'chat-msg' && step.data.role === 'supplier') replied.add(step.si)
    if (step.kind === 'quote') counts.quotes++
    if (step.kind === 'confirm') counts.confirmed++
  }
  counts.contacted = touched.size
  counts.replies = replied.size
  return counts
}

// Router state carries names + spec; resolve names to supplier objects.
// Deep links / refreshes with no state fall back to the default top-10 queue.
export function resolveShortlist(state) {
  const names = state?.intros
  if (Array.isArray(names) && names.length > 0) {
    const found = names.map((n) => suppliers.find((s) => s.name === n)).filter(Boolean)
    if (found.length > 0) return found
  }
  return introShortlist
}

// Top warm-introduction outcomes, read back from the generated script.
export function warmIntros(steps) {
  return steps
    .filter((s) => s.kind === 'warm-intro' || s.kind === 'warm-connected')
    .map((s) => s.data)
    .reduce((acc, d) => {
      if (!acc.length || acc[acc.length - 1].supplierName !== d.supplierName) {
        acc.push({ ...d })
      } else {
        acc[acc.length - 1].reply = d.reply
        acc[acc.length - 1].connected = d.connected
      }
      return acc
    }, [])
}

export function partnerOutcomes(list) {
  return list
    .filter((s) => s.partner)
    .map((s) => {
      const tier = fitTierFor(list.indexOf(s), list)
      const story = storyFor(s, tier)
      return { id: s.id, name: s.name, quote: story.quote, confirmed: Boolean(story.confirm) }
    })
}

// Full outcome fold of a generated run — every supplier in `list`, not just
// partners. Used by the in-call showcase to report who accepted, who merely
// quoted, and who passed (and why) straight from the scripted steps.
export function showcaseResults(steps, list) {
  const counts = foldCounts(steps, Infinity)
  const warm = warmIntros(steps)
  const bySupplier = list.map((s, si) => {
    const mine = steps.filter((st) => st.si === si)
    const quote = mine.find((st) => st.kind === 'quote')?.data ?? null
    const confirmed = mine.some((st) => st.kind === 'confirm')
    const followup = mine.find((st) => st.kind === 'followup')?.data ?? null
    const pass = mine.find((st) => st.kind === 'pass')?.data ?? null
    return {
      id: s.id,
      name: s.name,
      partner: Boolean(s.partner),
      quote,
      confirmed,
      passLine: pass?.line ?? null,
      followup: followup ?? null,
    }
  })
  return { counts, warm, bySupplier }
}

export function fmtOffset(sec) {
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return `T+${m}:${String(s).padStart(2, '0')}`
}

// Supplier quotes reused by the PUNKR live-call engine — the same fictional
// prices as the outreach playbooks above, keyed by supplier id.
export const QUOTE_BOOK = Object.fromEntries(
  Object.entries(STORY)
    .map(([id, story]) => [id, story.quote])
    .filter(([, quote]) => Boolean(quote))
)
