// Channel model — segments the flat timed script into the workspace's
// full-height screens. Pure functions over the step list from buildScript.
//
// Every step kind belongs to exactly one channel; `gap` spacers ride inside
// the chat channel so channel spans stay contiguous.

export const CHANNEL_DEFS = [
  {
    id: 'chat',
    label: 'Chat',
    kind: 'Live chat',
    title: 'On the chat lines.',
    // storm-chat-* — the in-call montage's parallel-chats beat.
    kinds: ['approve', 'review', 'gap', 'chat-msg', 'chat-status', 'client-check', 'storm-chat-open', 'storm-chat-q', 'storm-chat-a'],
  },
  {
    id: 'email',
    label: 'Email',
    kind: 'Drafted email',
    title: 'Spec sheets, drafted and sent.',
    // storm-email-* — the montage's parallel-emails beat.
    kinds: ['email-draft', 'email-sent', 'storm-email-open', 'storm-email-send', 'storm-email-reply'],
  },
  {
    id: 'call',
    label: 'Voice',
    kind: 'AI voice call',
    title: 'The agent picks up the phone.',
    // storm-call — the montage's overlapping-calls beat.
    kinds: ['call', 'storm-call-open', 'storm-call'],
  },
  {
    id: 'forms',
    label: 'Forms',
    kind: 'Web forms',
    title: 'Every contact form, filled.',
    // storm-form — the montage's no-answer forms-fallback beat.
    kinds: ['form-fill', 'form-submitted', 'storm-form-open', 'storm-form'],
  },
  {
    id: 'quotes',
    label: 'Quotes',
    kind: 'Quotes & follow-ups',
    title: 'Quotes land. Loose ends resolve.',
    kinds: ['quote', 'confirm', 'followup', 'pass', 'client-check'],
  },
  {
    id: 'intro',
    label: 'Intro',
    kind: 'Warm introductions',
    title: 'The handoff.',
    kinds: ['warm-intro', 'warm-connected'],
  },
]

// Relays live mid-chat on the timeline but surface as quiet digest cards in
// the Quotes & follow-ups screen — the chat thread ends with "let me check
// with the client" and the resolution lands with the outcomes.
const QUOTES_EXTRA = new Set(['client-check'])

// Ordered, non-empty channels with their time spans. Relay digests render in
// the quotes screen but happen mid-chat on the timeline, so they are excluded
// from span math — spans are otherwise contiguous by script construction.
export function buildChannels(steps) {
  const channels = []
  for (const def of CHANNEL_DEFS) {
    const chSteps = steps.filter((s) => def.kinds.includes(s.kind))
    if (chSteps.length === 0) continue
    const span = chSteps.filter((s) => !QUOTES_EXTRA.has(s.kind))
    const bounds = span.length > 0 ? span : chSteps
    const last = bounds[bounds.length - 1]
    channels.push({
      id: def.id,
      label: def.label,
      kind: def.kind,
      title: def.title,
      steps: chSteps,
      start: bounds[0].start,
      end: last.start + last.dur,
    })
  }
  return channels
}

// The channel that owns `elapsed` — the last one whose start has passed.
export function activeChannelIndex(channels, elapsed) {
  let idx = 0
  for (let i = 0; i < channels.length; i++) {
    if (channels[i].start <= elapsed) idx = i
    else break
  }
  return idx
}

// Steps of one channel grouped per supplier, in play order. Client-check
// steps are pulled out separately so the quotes screen can render them as
// quiet relay digests.
export function groupChannelSteps(ch, list) {
  const blocks = []
  const bySi = new Map()
  const relays = []
  for (const step of ch.steps) {
    if (QUOTES_EXTRA.has(step.kind) && ch.id === 'quotes') {
      relays.push(step)
      continue
    }
    if (step.si == null) continue
    if (!bySi.has(step.si)) {
      const block = { supplier: list[step.si], si: step.si, steps: [] }
      bySi.set(step.si, block)
      blocks.push(block)
    }
    bySi.get(step.si).steps.push(step)
  }
  return { blocks, relays }
}
