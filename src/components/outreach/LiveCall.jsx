// Aeko live call — the HappyRobot moment. An incoming call from Aeko,
// sourcing agent; a scripted, deterministic discovery conversation the user
// answers by voice (browser speech recognition) or typed text; PUNKR replies
// via browser TTS with a live transcript; the answers drive supplier
// matching, quote acceptance, warm-intro and PO handoff on static data.
// Fully keyless: everything runs locally in the browser.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  PUNKR,
  CUSTOMER,
  ORDER_CONTEXT,
  SCENES,
  EMPTY_BRIEF,
  rankSuppliers,
  quoteFor,
  quoteFlags,
  topMatches,
  recapLine,
  matchAnnouncement,
  poNumber,
  fmtInt,
  callFeedWave,
  forkFor,
  forkBranch,
  parseYesNo,
  briefRowsFor,
  feedStatsFor,
} from '../../data/punkrCall.js'
import { fmtOffset, buildScript, showcaseResults } from '../../data/outreach.js'
import { COLD_OPEN_FLAG } from '../../data/coldOpen.js'
import ShowcaseOverlay from './ShowcaseOverlay.jsx'
import { OpsApprovalCard, IntroAcceptCard, INTRO_CONTACT } from '../PersonaCards.jsx'
import {
  AudioLinesIcon,
  CheckCircleIcon,
  ClipboardListIcon,
  ClockIcon,
  EyeIcon,
  GlobeIcon,
  MailIcon,
  MessageCircleIcon,
  MicIcon,
  PhoneIcon,
  PhoneOffIcon,
  SendIcon,
  SparklesIcon,
  Volume2Icon,
  VolumeXIcon,
  XIcon,
} from '../icons.jsx'

const BRAND = { name: 'Aekovera' }

let uid = 0
const nextId = () => `c${++uid}`

// Voice casting: prefer a known-female English voice, then any non-male
// English voice — never let the browser's default (often male) drift through.
const FEMALE_VOICE = /female|samantha|aria|jenny|zira|michelle|ava\b|allison|susan|karen|moira|tessa|fiona|catherine|victoria|serena|kate|shelley|nicky|joana|google us english/i
const MALE_VOICE = /\bmale\b|david|mark\b|alex\b|daniel|fred\b|tom\b|george|james|aaron|arthur|oliver|ryan|rishi|guy\b/i

function pickVoice() {
  try {
    const vs = window.speechSynthesis?.getVoices?.() ?? []
    const en = vs.filter((v) => /^en/i.test(v.lang))
    const enUS = en.filter((v) => /en[-_]US/i.test(v.lang))
    return (
      enUS.find((v) => FEMALE_VOICE.test(v.name)) ||
      en.find((v) => FEMALE_VOICE.test(v.name)) ||
      enUS.find((v) => !MALE_VOICE.test(v.name)) ||
      en.find((v) => !MALE_VOICE.test(v.name)) ||
      enUS[0] ||
      en[0] ||
      null
    )
  } catch {
    return null
  }
}

const fmtClock = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

// The showcase time-skip: when the call resumes, the clocks jump this far —
// the visible "5 minutes later" cue (rail clock + transcript).
const SHOWCASE_SKIP_SECONDS = 300

// The one-line brief carried into the outreach run — identical composition
// wherever the run is seeded from the call (montage overlay, workspace CTA).
const briefLineFor = (b) => {
  const volume = b.volume ?? ORDER_CONTEXT.volume
  return [
    b.product?.label ?? `${ORDER_CONTEXT.retailer} private-label cookies`,
    `${fmtInt(volume)} units`,
    b.packaging?.label,
    b.deadline ? `landing ${b.deadline.label}` : null,
    'confirmed on the live call',
  ]
    .filter(Boolean)
    .join(' · ')
}

// ---------------------------------------------------------------------------
// Sub views
// ---------------------------------------------------------------------------

function IncomingScreen({ onAccept, onDecline, asrOk }) {
  return (
    <div className="lcall__stage lcall__stage--incoming">
      <div className="lcall__incoming">
        <div className="lcall__rings" aria-hidden="true">
          <span />
          <span />
          <span />
          <div className="lcall__pbadge">P</div>
        </div>
        <p className="lcall__microlabel">
          Incoming call · {PUNKR.name} ({BRAND.name}) · {PUNKR.number}
        </p>
        <h1 className="lcall__caller">
          Calling {CUSTOMER.name} <span>{CUSTOMER.title} · {CUSTOMER.company}</span>
        </h1>
        <p className="lcall__context">
          Re: <strong>{ORDER_CONTEXT.story}</strong> · {ORDER_CONTEXT.placed} · shipments{' '}
          <strong>{ORDER_CONTEXT.urgency}</strong>
        </p>
        <p className="lcall__context lcall__context--sub">
          {PUNKR.name} — the sourcing agent working your order — confirms a few details
          before the network runs.
        </p>
        <div className="lcall__incoming-actions">
          <button type="button" className="lcall__btn lcall__btn--decline" onClick={onDecline}>
            <PhoneOffIcon size={17} /> Decline
          </button>
          <button type="button" className="lcall__btn lcall__btn--accept" onClick={onAccept}>
            <PhoneIcon size={17} /> Accept call
          </button>
        </div>
        <p className="lcall__fineprint">
          Fictional demo call, simulated locally — no external network.{' '}
          {asrOk ? 'Mic + voice ready.' : 'Voice answers need Chrome or Edge — typing works everywhere.'}
        </p>
      </div>
    </div>
  )
}

function MatchBoard({ matches, mini = false }) {
  return (
    <div className={`call-match${mini ? ' call-match--mini' : ''}`}>
      <div className="call-match__head">
        <SparklesIcon size={13} /> Supplier match board · ranked live on the call
      </div>
      {matches.map((m, i) => (
        <div key={m.supplier.id} className={`call-match__row${i === 0 ? ' is-top' : ''}`}>
          <span className="call-match__rank">#{i + 1}</span>
          <span className="call-match__name">
            {m.supplier.name}
            {m.supplier.partner && <em>Partner</em>}
          </span>
          <span className="call-match__score">{m.score}</span>
          <span className="call-match__why">{m.reasons.slice(0, 2).join(' · ')}</span>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Background pipeline — "While you talk — Aeko is already working". A live
// supplier-side message feed (emails, chats, voice touches, forms) that runs
// from call connect; each customer answer steers the already-running flow.
// ---------------------------------------------------------------------------

const FEED_ICONS = {
  scan: GlobeIcon,
  shortlist: EyeIcon,
  chat: MessageCircleIcon,
  email: MailIcon,
  voice: PhoneIcon,
  form: ClipboardListIcon,
  reply: MessageCircleIcon,
  accept: CheckCircleIcon,
  reject: XIcon,
  freight: ClockIcon,
  note: SparklesIcon,
}

function FeedRow({ ev }) {
  const Icon = FEED_ICONS[ev.kind] ?? SparklesIcon
  return (
    <div className={`pipe__row pipe__row--${ev.tone}`}>
      <span className="pipe__row-icon">
        <Icon size={12} />
      </span>
      <span className="pipe__row-text">
        <strong>{ev.title}</strong>
        {ev.detail && <span>{ev.detail}</span>}
      </span>
      <span className="pipe__row-t">{fmtOffset(ev.t)}</span>
    </div>
  )
}

const PIPE_STAGES = [
  { id: 'scan', label: 'Scan' },
  { id: 'shortlist', label: 'Shortlist' },
  { id: 'screen', label: 'MOQ screen' },
  { id: 'package', label: 'Packaging' },
  { id: 'freight', label: 'Freight' },
]

function PipelineCard({ brief, events, stats, liveMatches }) {
  const feedRef = useRef(null)
  const doneFlags = {
    scan: Boolean(brief.product),
    shortlist: Boolean(brief.volume),
    screen: Boolean(brief.moqTolerance),
    package: Boolean(brief.packaging),
    freight: Boolean(brief.deadline),
  }
  const activeStage = PIPE_STAGES.find((s) => !doneFlags[s.id])

  // Keep the feed pinned to its newest event, chat-client style.
  useEffect(() => {
    const el = feedRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [events.length])

  return (
    <div className="rail-card pipe">
      <p className="rail-card__label">While you talk — Aeko is already working</p>
      <div className="pipe__strip" aria-label="Background pipeline progress">
        {PIPE_STAGES.map((s) => (
          <span
            key={s.id}
            className={[
              'pipe__stage',
              doneFlags[s.id] ? 'is-done' : '',
              activeStage?.id === s.id ? 'is-active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {doneFlags[s.id] ? <CheckCircleIcon size={10} /> : <i aria-hidden="true" />} {s.label}
          </span>
        ))}
      </div>
      <div className="pipe__feed" ref={feedRef} aria-live="polite">
        {events.length === 0 && <p className="pipe__empty">Connecting the network…</p>}
        {events.map((ev) => (
          <FeedRow key={ev.id} ev={ev} />
        ))}
      </div>
      <p className="pipe__count" aria-live="polite">
        {stats.touched} suppliers touched · {stats.replies} replies · {stats.accepts.length} accepted ·{' '}
        {stats.rejects.length} passed
      </p>
      {liveMatches && (
        <div className="pipe__board">
          <MatchBoard matches={liveMatches} mini />
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Complete-circle summary — the final card addressed to the customer: what
// THEY said this session, what Aeko did with each answer in the background,
// and where the order stands now.
// ---------------------------------------------------------------------------

function SummaryCard({ data }) {
  const { rows, fork, stats, quote, po, volume, showcase } = data
  return (
    <div className="sum">
      <p className="sum__head">
        <SparklesIcon size={12} /> Complete circle · this session
      </p>
      <div className="sum__sec">
        <h4>What you said</h4>
        <ul className="sum__rows">
          {rows.map((r) => (
            <li key={r.k}>
              <span>{r.k}</span>
              <strong>{r.v}</strong>
            </li>
          ))}
          {fork && (
            <li>
              <span>The decision</span>
              <strong>{fork}</strong>
            </li>
          )}
        </ul>
      </div>
      <div className="sum__sec">
        <h4>What Aeko did with it</h4>
        <p className="sum__line">
          Background run while you talked: {stats.touched} suppliers touched · {stats.replies} replies ·{' '}
          {stats.freight.length} freight lanes compared.
        </p>
        {stats.accepts.length > 0 && (
          <ul className="sum__li">
            {stats.accepts.map((a) => (
              <li key={a.name} className="is-ok">
                <CheckCircleIcon size={12} /> <span><strong>{a.name}</strong> — {a.detail}</span>
              </li>
            ))}
          </ul>
        )}
        {stats.rejects.length > 0 && (
          <ul className="sum__li">
            {stats.rejects.map((r) => (
              <li key={r.name} className="is-drop">
                <XIcon size={12} /> <span><strong>{r.name}</strong> — {r.reason}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {showcase && (
        <div className="sum__sec">
          <h4>The five-minute run — while you held the line</h4>
          <p className="sum__line">
            {showcase.counts.contacted} suppliers contacted · {showcase.counts.replies} replies ·{' '}
            {showcase.counts.quotes} quotes · {showcase.counts.confirmed} confirmed.
          </p>
          <ul className="sum__li">
            {showcase.bySupplier.map((o) => {
              const text = o.confirmed && o.quote
                ? `${o.quote.price}/u · ${o.quote.lead} — accepted, project confirmed`
                : o.quote
                  ? `${o.quote.price}/u · ${o.quote.lead} — quote on file`
                  : o.passLine
                    ? 'Graceful pass — kept warm, no spec sent'
                    : 'Brief delivered — follow-up scheduled'
              return (
                <li key={o.id} className={o.confirmed ? 'is-ok' : o.passLine ? 'is-drop' : ''}>
                  {o.confirmed ? <CheckCircleIcon size={12} /> : <ClockIcon size={12} />}{' '}
                  <span>
                    <strong>{o.name}</strong> — {text}
                  </span>
                </li>
              )
            })}
            {showcase.warm.length > 0 && (
              <li className="is-ok">
                <CheckCircleIcon size={12} />{' '}
                <span>
                  <strong>Warm intros</strong> — {showcase.warm.map((w) => w.supplierName).join(' & ')} accepted
                </span>
              </li>
            )}
          </ul>
        </div>
      )}
      <div className="sum__sec">
        <h4>Where your order stands</h4>
        <ul className="sum__li">
          {quote && (
            <li className="is-ok">
              <CheckCircleIcon size={12} /> <span>Quote {quote.price}/u from {quote.supplier.name} — accepted, production slot held</span>
            </li>
          )}
          {po && (
            <li className="is-ok">
              <CheckCircleIcon size={12} /> <span>PO {po} confirmed — {fmtInt(volume)} units, shipments urgent end to end</span>
            </li>
          )}
          <li className="is-ok">
            <CheckCircleIcon size={12} /> <span>Warm intro accepted — {INTRO_CONTACT.name} ({INTRO_CONTACT.role}) took the line</span>
          </li>
        </ul>
      </div>
    </div>
  )
}

function TranscriptItem({ item }) {
  if (item.who === 'system') {
    return (
      <div className="bubble bubble--system">
        <span>{item.text}</span>
      </div>
    )
  }
  if (item.who === 'card') {
    if (item.type === 'matches') return <MatchBoard matches={item.data} />
    if (item.type === 'quoteAccepted')
      return (
        <OpsApprovalCard
          supplier={item.data.supplier}
          headline="Quote reviewed & accepted — supplier ops"
          lines={[`${item.data.quote.price} / unit · ${item.data.quote.lead}`, item.data.quote.volumeNote]}
          stamp="Accepted for production"
        />
      )
    if (item.type === 'introAccepted')
      return (
        <IntroAcceptCard
          supplier={item.data.supplier}
          headline={`${INTRO_CONTACT.name} took the intro call`}
          lines={[INTRO_CONTACT.role, 'Intro connected on the line']}
          stamp="Warm intro accepted"
        />
      )
    if (item.type === 'poConfirmed')
      return (
        <OpsApprovalCard
          supplier={item.data.supplier}
          headline={`PO ${item.data.po} confirmed — production slot held`}
          lines={[`${fmtInt(item.data.volume)} units · shipments flagged urgent end to end`]}
          stamp="PO confirmed by supplier ops"
        />
      )
    if (item.type === 'summary') return <SummaryCard data={item.data} />
    if (item.type === 'calendar')
      return (
        <OpsApprovalCard
          supplier={item.data.supplier}
          headline={`${item.data.slot} — kickoff call on the calendar`}
          lines={['You, their ops desk, and me', 'Agenda: production schedule, first-ship date, quality spec']}
          stamp="Scheduled from this call"
        />
      )
  
    return null
  }
  return (
    <div className={`bubble ${item.who === 'you' ? 'bubble--you' : 'bubble--punkr'}`}>
      <span className="bubble__who">{item.who === 'you' ? `${CUSTOMER.first} (you)` : PUNKR.name}</span>
      <p>{item.text}</p>
      {item.who === 'you' && item.via === 'voice' && (
        <span className="bubble__via">
          <AudioLinesIcon size={11} /> voice
        </span>
      )}
    </div>
  )
}

function BriefRail({ brief, matches, quote, po, elapsed, phase, feed, feedStats, liveMatches }) {
  const rows = [
    { k: 'Product', v: brief.product?.label },
    { k: 'Volume', v: brief.volume ? `${fmtInt(brief.volume)} units` : null },
    {
      k: 'MOQ stance',
      v: brief.moqTolerance
        ? brief.moqTolerance.kind === 'max'
          ? `Max ${fmtInt(brief.moqTolerance.max)}`
          : brief.moqTolerance.kind
        : null,
    },
    { k: 'Packaging', v: brief.packaging?.label },
    { k: 'Deadline', v: brief.deadline?.label },
  ]
  return (
    <aside className="lcall__rail">
      <div className="rail-card">
        <div className="rail-card__head">
          <span className="rail-card__live">
            <i aria-hidden="true" /> {phase === 'ended' ? 'CALL ENDED' : 'LIVE'}
          </span>
          <span className="rail-card__clock">{fmtClock(elapsed)}</span>
        </div>
        <p className="rail-card__order">
          {ORDER_CONTEXT.volumeLabel} <em>{ORDER_CONTEXT.urgency}</em>
        </p>
        <p className="rail-card__channel">{ORDER_CONTEXT.channel}</p>
        <p className="rail-card__with">
          with {CUSTOMER.name} · {CUSTOMER.company}
        </p>
      </div>
      <PipelineCard brief={brief} events={feed} stats={feedStats} liveMatches={liveMatches} />
      <div className="rail-card">
        <p className="rail-card__label">Confirmed live on this call</p>
        <ul className="rail-brief">
          {rows.map((r) => (
            <li key={r.k} className={r.v ? 'is-set' : ''}>
              <span>{r.k}</span>
              <strong>{r.v || '—'}</strong>
              {r.v && <CheckCircleIcon size={13} className="rail-brief__check" />}
            </li>
          ))}
        </ul>
      </div>
      {(matches || quote || po) && (
        <div className="rail-card">
          <p className="rail-card__label">Call outcomes</p>
          <ul className="rail-out">
            {matches && (
              <li>
                <CheckCircleIcon size={13} /> {matches.length} suppliers matched
              </li>
            )}
            {quote && (
              <li>
                <CheckCircleIcon size={13} /> Quote {quote.price}/u · {quote.supplier.name}
              </li>
            )}
            {po && (
              <li>
                <CheckCircleIcon size={13} /> PO {po} confirmed
              </li>
            )}
          </ul>
        </div>
      )}
    </aside>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

// Natural spoken acknowledgments after each answer — the transcript keeps the
// fuller confirm text; the voice stays conversational.
const ACKS = [
  'Got it.',
  'Perfect — that helps.',
  'Right — noted.',
  'Okay, good.',
  'Great — on it.',
  'Okay — locked in.',
  'Good — thank you.',
  'Makes sense — thanks.',
]
// Spontaneity: a random pick per answer, so no two calls read identically.
const ackFor = () => ACKS[Math.floor(Math.random() * ACKS.length)]
// Light spoken lead-ins — ONE per prompt (first line only), never repeated
// stock praise, and TTS-friendly (no literal uhm/ahh).
const FILLERS = { scale: ['', 'Alright — ', 'Okay, so — '], spec: ['', 'Alright — ', 'So — '] }
const fillerFor = (id) => (FILLERS[id] ? FILLERS[id][Math.floor(Math.random() * FILLERS[id].length)] : '')
const withFiller = (id, t) => {
  const f = fillerFor(id)
  return f ? f + t.charAt(0).toLowerCase() + t.slice(1) : t
}
// The dropped-call bit — when the fourth ask goes unanswered, Aeko assumes
// the line died, says goodbye with flair, hangs up, and calls right back.
const DROPPED_LINES = [
  { show: '…Hello? I think the call just dropped.', speak: '…Hello? I think the call just dropped.' },
  { show: '…Still nothing? Network must be down on your end.', speak: '…Still nothing? Network must be down on your end.' },
  { show: '…You there? Probably in a subway — hold on, calling back.', speak: '…You there? Probably in a subway — hold on, calling back.' },
]

export default function LiveCall() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState('incoming') // incoming | live | ended
  const [transcript, setTranscript] = useState([])
  const [brief, setBrief] = useState(EMPTY_BRIEF)
  const [activeScene, setActiveScene] = useState(null) // index while a question is open
  const [awaiting, setAwaiting] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [muted, setMuted] = useState(false)
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [micMuted, setMicMuted] = useState(false)
  const [matches, setMatches] = useState(null)
  const [quote, setQuote] = useState(null)
  const [po, setPo] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [input, setInput] = useState('')
  // quote fork chips (null = not in the fork; a question's chips otherwise)
  const [forkChips, setForkChips] = useState(null)
  // background supplier-side feed, revealed against its own clock
  const [feedEvents, setFeedEvents] = useState([])
  const [feedClock, setFeedClock] = useState(0)
  // the in-call showcase — the outreach montage the call pauses for
  const [showcase, setShowcase] = useState(null)
  // the dropped-call bit — the line dies, Aeko hangs up and calls back
  const [drop, setDrop] = useState(null) // null | 'cut' | 'ringing'

  const mutedRef = useRef(muted)
  mutedRef.current = muted
  const cancelFns = useRef([])
  const interrupted = useRef(false)
  const pendingAnswer = useRef(null)
  const answerResolver = useRef(null)
  const startedRef = useRef(false)
  const recognitionRef = useRef(null)
  const micBlockedRef = useRef(false)
  // the currently-pending question's short recasts (for silence re-asks)
  const pendingAsk = useRef(null)
  const listRef = useRef(null)
  const finalBriefRef = useRef(null)
  const feedRef = useRef([]) // mirror of feedEvents for sync reads inside run()
  const feedClockRef = useRef(0) // mirror of feedClock for wave anchors
  const showcaseDataRef = useRef(null) // montage list/steps/results, set at pause
  const showcaseResolveRef = useRef(null) // resolves when the montage closes

  const asrOk = useMemo(
    () => typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition),
    [],
  )
  const activeChips = forkChips ?? (awaiting && activeScene != null ? SCENES[activeScene].chips : [])

  const push = useCallback((entry) => setTranscript((t) => [...t, entry]), [])
  const pushPunkr = useCallback((text) => push({ id: nextId(), who: 'punkr', text }), [push])
  const pushYou = useCallback((text, via) => push({ id: nextId(), who: 'you', text, via }), [push])
  const pushSystem = useCallback((text) => push({ id: nextId(), who: 'system', text }), [push])

  // append events to the background feed; each keeps its own reveal time `t`
  const appendFeed = useCallback((wave) => {
    if (!wave.length) return
    const withIds = wave.map((ev) => ({ ...ev, id: nextId() }))
    feedRef.current = [...feedRef.current, ...withIds]
    setFeedEvents(feedRef.current)
  }, [])

  // a supplier-side wave steered by the brief as it stands right now
  const steerFeed = useCallback(
    (stage, b) => {
      appendFeed(callFeedWave(stage, b, feedClockRef.current + 0.5))
    },
    [appendFeed],
  )

  const feedEvent = useCallback(
    (ev) => {
      appendFeed([{ ...ev, t: feedClockRef.current + 0.6 }])
    },
    [appendFeed],
  )

  // THE SHOWCASE BEAT — pause the call mid-line and play the automated
  // outreach run full-screen: pre-seeded from the captured brief, montage
  // pace, reusing the workspace's own run components. Resolves when the
  // montage closes (digest auto-advance or Skip); the script never advances
  // on its own while it is up.
  const openShowcase = useCallback((token, b) => {
    // Top four of the ranked field: the montage gets the match board's top
    // three plus the next fit, so the run carries an accept, a bare quote,
    // and a graceful pass — real accepts and rejections to come back to.
    const list = rankSuppliers(b).slice(0, 4).map((r) => r.supplier)
    const { steps } = buildScript(list)
    const results = showcaseResults(steps, list)
    showcaseDataRef.current = { brief: { ...b }, list, steps, results }
    return new Promise((resolve) => {
      showcaseResolveRef.current = resolve
      token.cancelFns.push(() => {
        const r = showcaseResolveRef.current
        showcaseResolveRef.current = null
        setShowcase(null)
        r?.()
      })
      // hold the line: nothing the customer says during the montage can
      // queue up as an answer to a later question
      setAwaiting(false)
      setInterim('')
      try {
        recognitionRef.current?.stop?.()
      } catch {
        /* noop */
      }
      setListening(false)
      setShowcase({ list, steps, briefLine: briefLineFor(b) })
    })
  }, [])

  // Resume: fold the montage's outcomes into the call — clocks jump the
  // five-minute skip, the rail feed records each accept/quote/pass, and the
  // transcript gets its "five minutes later" cue. The call then continues
  // from the exact line it paused on.
  const resumeFromShowcase = useCallback(() => {
    const data = showcaseDataRef.current
    setShowcase(null)
    if (!data) return
    feedClockRef.current += SHOWCASE_SKIP_SECONDS
    setFeedClock(feedClockRef.current)
    setElapsed((e) => e + SHOWCASE_SKIP_SECONDS)
    const evs = []
    for (const o of data.results.bySupplier) {
      if (o.confirmed && o.quote) {
        evs.push({
          kind: 'accept',
          title: `Accepted · ${o.name}`,
          detail: `${o.quote.price}/u · ${o.quote.lead} · project confirmed`,
          tone: 'ok',
        })
      } else if (o.quote) {
        evs.push({
          kind: 'note',
          title: `Quote received · ${o.name}`,
          detail: `${o.quote.price}/u · ${o.quote.lead} — quote on file`,
          tone: 'ok',
        })
      } else if (o.passLine) {
        evs.push({
          kind: 'reject',
          title: `Passed · ${o.name}`,
          detail: 'no spec sent — kept warm for a matching order',
          tone: 'drop',
        })
      }
    }
    appendFeed(evs.map((ev, i) => ({ ...ev, t: feedClockRef.current + 0.4 + i * 0.3 })))
    pushSystem(
      `Five minutes later — the outreach run finished while ${CUSTOMER.first} held the line.`,
    )
  }, [appendFeed, pushSystem])

  // the montage's close — its outcomes land via resumeFromShowcase inside run()
  const closeShowcase = useCallback(() => {
    const resolve = showcaseResolveRef.current
    showcaseResolveRef.current = null
    resolve?.()
  }, [])

  // Replay the five-minute run from the ended state — the story stays, the
  // call is over, so closing a replay never "resumes" anything.
  const reopenShowcase = useCallback(() => {
    const s = showcaseDataRef.current
    if (s) setShowcase({ list: s.list, steps: s.steps, briefLine: briefLineFor(s.brief) })
  }, [])

  // events whose reveal time has passed — the visible feed
  const visibleFeed = useMemo(() => feedEvents.filter((e) => e.t <= feedClock), [feedEvents, feedClock])
  const feedStats = useMemo(() => feedStatsFor(visibleFeed), [visibleFeed])
  const liveMatches = useMemo(
    () => (brief.product && brief.volume ? topMatches(rankSuppliers(brief), 3) : null),
    [brief],
  )

  // keep the transcript pinned to the latest entry
  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [transcript])

  // call timer + background-feed clock share one 1s tick. Both freeze while
  // the showcase montage is up — the clocks jump +5 minutes at the resume.
  useEffect(() => {
    if (phase !== 'live' || showcase) return
    const t = setInterval(() => {
      feedClockRef.current += 1
      setFeedClock(feedClockRef.current)
      setElapsed((e) => e + 1)
    }, 1000)
    return () => clearInterval(t)
  }, [phase, showcase])

  // incoming ringtone — best-effort dual-tone loop, stopped when the phase moves on
  useEffect(() => {
    if (phase !== 'incoming') return undefined
    let ctx = null
    let timer = null
    let stopped = false
    const start = () => {
      if (stopped) return
      try {
        ctx = ctx || new (window.AudioContext || window.webkitAudioContext)()
        if (ctx.state === 'suspended') ctx.resume().catch(() => {})
        const beep = (t0) => {
          ;[440, 480].forEach((f) => {
            const o = ctx.createOscillator()
            const g = ctx.createGain()
            o.frequency.value = f
            o.type = 'sine'
            g.gain.setValueAtTime(0.0001, t0)
            g.gain.exponentialRampToValueAtTime(0.05, t0 + 0.06)
            g.gain.setValueAtTime(0.05, t0 + 0.95)
            g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.05)
            o.connect(g).connect(ctx.destination)
            o.start(t0)
            o.stop(t0 + 1.1)
          })
        }
        const loop = () => {
          if (stopped) return
          beep(ctx.currentTime + 0.02)
          timer = setTimeout(loop, 2400)
        }
        loop()
      } catch {
        /* ringtone is best-effort only */
      }
    }
    start()
    const unlock = () => start()
    window.addEventListener('pointerdown', unlock, { once: true })
    return () => {
      stopped = true
      clearTimeout(timer)
      window.removeEventListener('pointerdown', unlock)
      try {
        ctx?.close()
      } catch {
        /* noop */
      }
    }
  }, [phase])

  // The demo screen is large — scale the whole call view up while mounted,
  // and restore the root scale on unmount so other routes are untouched.
  useEffect(() => {
    document.documentElement.style.fontSize = '115%'
    // Prime the voice list — Chrome loads voices async, so the first
    // utterance should already have the female voice available.
    try {
      window.speechSynthesis?.getVoices?.()
    } catch {
      /* noop */
    }
    return () => {
      document.documentElement.style.fontSize = ''
    }
  }, [])

  // Refresh replay: clear the cold-open session flag as soon as the call is
  // mounted, so the next visit to /outreach/live — including a mid-call
  // refresh — starts from the introduction again.
  useEffect(() => {
    try {
      sessionStorage.removeItem(COLD_OPEN_FLAG)
    } catch {
      /* private mode — nothing persisted anyway */
    }
  }, [])

  const stopSpeech = useCallback(() => {
    try {
      window.speechSynthesis?.cancel()
    } catch {
      /* noop */
    }
  }, [])

  // speak one line; resolves when spoken (or on a pace timer when muted/unsupported)
  const speakLine = useCallback(
    (text, token) =>
      new Promise((resolve) => {
        setSpeaking(true)
        let settled = false
        const finish = () => {
          if (settled) return
          settled = true
          setSpeaking(false)
          resolve()
        }
        token.cancelFns.push(() => {
          stopSpeech()
          finish()
        })
        const pace = 620 + text.length * 40
        if (!mutedRef.current && 'speechSynthesis' in window) {
          try {
            stopSpeech()
            const u = new SpeechSynthesisUtterance(text)
            u.lang = 'en-US'
            u.rate = 1.06
            u.pitch = 1.08
            const v = pickVoice()
            if (v) u.voice = v
            u.onend = finish
            u.onerror = finish
            window.speechSynthesis.speak(u)
            const safety = setTimeout(finish, pace + 4000)
            token.cancelFns.push(() => clearTimeout(safety))
            return
          } catch {
            /* fall through to paced reveal */
          }
        }
        setTimeout(finish, Math.min(pace, 6000))
      }),
    [stopSpeech],
  )

  // speak a series of lines; aborts early when the user barges in. A line is
  // either a string (displayed AND spoken) or { show, speak } — the displayed
  // transcript can carry fuller detail while the spoken line stays lean.
  const say = useCallback(
    async (lines, token) => {
      interrupted.current = false
      for (const line of lines) {
        if (token.cancelled || interrupted.current) return
        const show = typeof line === 'string' ? line : line.show
        const spoken = typeof line === 'string' ? line : line.speak
        pushPunkr(show)
        if (!spoken) continue
        // eslint-disable-next-line no-await-in-loop -- lines must be spoken in order
        await speakLine(spoken, token)
      }
    },
    [pushPunkr, speakLine],
  )

  // Silence re-asks — while an answer is owed and the line goes quiet for
  // fifteen seconds, Aeko checks in AND re-lands the question in fresh, fewer
  // words (the scene's recasts) — never the same phrasing twice. The moment
  // the user starts speaking (interim transcript), the timer resets: Aeko
  // never talks while the user is talking — she just listens. Speech only;
  // these never enter the transcript. After the FOURTH ask with nothing back,
  // she treats the line as dead and resolves the wait with via:'dropped' —
  // the run loop plays the dropped-call bit.
  const QUIPS = [
    'Still with me?',
    'Stephanie? You there?',
    'Hello? Line just went quiet on me.',
    "Take your time — I'm here.",
  ]
  const quipState = useRef({ idx: 0, timer: null })
  useEffect(() => {
    const waiting = phase === 'live' && !showcase && !drop && (awaiting || forkChips != null)
    if (!waiting) {
      clearTimeout(quipState.current.timer)
      return undefined
    }
    const fire = () => {
      if (interim) return // user is mid-utterance — keep listening
      quipState.current.idx += 1
      if (quipState.current.idx >= 4) {
        // Fourth ask went unanswered — the line is dead; play the bit.
        answerResolver.current?.({ text: '', via: 'dropped' })
        return
      }
      const ask = pendingAsk.current
      const recasts = ask?.recasts ?? []
      const recast = recasts.length ? recasts[(quipState.current.idx - 1) % recasts.length] : null
      const check = QUIPS[(quipState.current.idx - 1) % QUIPS.length]
      const speakNow = async () => {
        const t = { cancelled: false, cancelFns: [] }
        await speakLine(check, t)
        await new Promise((r) => setTimeout(r, 1100))
        if (recast) await speakLine(recast, t)
      }
      speakNow()
      quipState.current.timer = window.setTimeout(fire, 15000)
    }
    quipState.current.timer = window.setTimeout(fire, 15000)
    return () => clearTimeout(quipState.current.timer)
  }, [phase, awaiting, forkChips, showcase, drop, speakLine, interim])

  // The dropped-call bit: flair goodbye → transcript note → hang up → call
  // back → recap the agreed details → re-land the pending question in the
  // storyline exactly where it left off.
  const runDropped = useCallback(
    async (token, b, reAsk) => {
      quipState.current.idx = 0
      const flair = DROPPED_LINES[Math.floor(Math.random() * DROPPED_LINES.length)]
      await say([flair], token)
      if (token.cancelled) return
      pushSystem('(user dropped off, calling back)')
      await say([{ show: 'Let me call you right back.', speak: 'Let me call you right back.' }], token)
      if (token.cancelled) return
      setDrop('cut')
      await new Promise((r) => setTimeout(r, 2400))
      if (token.cancelled) return
      setDrop('ringing')
      pushSystem('Calling back…')
      await new Promise((r) => setTimeout(r, 1900))
      if (token.cancelled) return
      setDrop(null)
      pushSystem('Back on the line')
      const rows = briefRowsFor(b)
      const recap = rows.length ? rows.map((r) => `${r.k}: ${r.v}`).join(' · ') : null
      await say(
        [
          recap
            ? {
                show: `So… to confirm we agreed on these details — ${recap}.`,
                speak: `So… to confirm we agreed on these details — ${recap}.`,
              }
            : {
                show: `So… picking up right where we left off.`,
                speak: `Okay, you're back — picking up right where we left off.`,
              },
        ],
        token,
      )
      if (token.cancelled || !reAsk) return
      await say([reAsk], token)
    },
    [say, pushSystem],
  )

  const waitForAnswer = useCallback(
    (token) =>
      new Promise((resolve) => {
        if (pendingAnswer.current) {
          const a = pendingAnswer.current
          pendingAnswer.current = null
          resolve(a)
          return
        }
        answerResolver.current = (payload) => {
          answerResolver.current = null
          resolve(payload)
        }
        token.cancelFns.push(() => answerResolver.current?.({ text: '', via: 'cancel' }))
      }),
    [],
  )

  // submit an answer (typed, chip, or final speech result)
  const submit = useCallback(
    (text, via) => {
      const t = (text || '').trim()
      if (!t) return
      stopSpeech()
      if (answerResolver.current) {
        answerResolver.current({ text: t, via })
      } else {
        pendingAnswer.current = { text: t, via }
        interrupted.current = true // barge-in: drop the remaining spoken lines
        stopSpeech()
      }
    },
    [stopSpeech],
  )

  // the call script — one linear async pass over the modular scene list.
  // Spoken lines stay short and conversational; the transcript panel carries
  // the fuller detail as text. The background supplier feed runs from connect.
  const run = useCallback(
    async (token) => {
      const mark = (fn) => {
        if (!token.cancelled) fn()
      }
      // The background flow opens the moment the call connects — supplier
      // messages are already firing while the first question is asked.
      steerFeed('open', { ...EMPTY_BRIEF })
      await new Promise((r) => setTimeout(r, 600))
      await say(
        [
          {
            show: `Hi ${CUSTOMER.first} — this is ${PUNKR.name}, calling from ${BRAND.name} about ${ORDER_CONTEXT.story}. I'm the sourcing agent on it — I confirm details before the network runs.`,
            speak: `Hi ${CUSTOMER.first}, this is ${PUNKR.name} from ${BRAND.name}. You placed the big ${ORDER_CONTEXT.retailer} cookie order about four minutes ago — I'm the sourcing agent on it.`,
          },
          {
            show: `Two things to lock in — and I'll start working the supplier network while we're still on the line.`,
            speak: `Two things to lock in — and I'm already working the network while we talk.`,
          },
        ],
        token,
      )
      if (token.cancelled) return
      const b = { ...EMPTY_BRIEF }
      for (let i = 0; i < SCENES.length; i++) {
        const scene = SCENES[i]
        let answered = false
        let prompted = false
        let recastIdx = 0
        while (!answered) {
          if (token.cancelled) return
          mark(() => setActiveScene(i))
          if (!prompted) {
            // One lead-in on the first line only — never per-bullet praise.
            const pl = scene.prompt(b)
            await say(
              pl.map((t, li) => {
                const line = li === 0 ? withFiller(scene.id, t) : t
                return { show: line, speak: line }
              }),
              token,
            )
            prompted = true
          }
          if (token.cancelled) return
          pendingAsk.current = scene.recasts?.length ? { recasts: scene.recasts } : null
          mark(() => setAwaiting(true))
          const { text, via } = await waitForAnswer(token)
          if (token.cancelled) return
          mark(() => {
            setAwaiting(false)
            setActiveScene(null)
          })
          pendingAsk.current = null
          if (via === 'dropped') {
            const rq = scene.recasts?.length ? scene.recasts[recastIdx % scene.recasts.length] : null
            recastIdx += 1
            await runDropped(
              token,
              b,
              rq ? { show: rq, speak: rq } : null,
            )
            if (token.cancelled) return
            prompted = true // the recap + re-ask covered it — don't re-run the full prompt
            continue
          }
          pushYou(text, via)
          const patch = scene.parse(text)
          if (!patch) {
            // Off-topic or unclear answer: one polite, brief bridge that
            // acknowledges what the user actually said (echoing it when it's
            // short), then — after a small beat — comes back to the question
            // in fresh, fewer words. No re-asking the full prompt.
            const short = (text || '').trim()
            const echoable = short.length > 0 && short.length <= 48 && short.split(/\s+/).length <= 7
            const recover = scene.recover ?? {
              show: `Of course — noted with thanks. Say it once more, or tap an answer below.`,
              speak: `Of course — noted. Once more, or tap an answer below.`,
            }
            await say(
              [
                {
                  show: echoable ? `“${short}” — noted with thanks.` : recover.show,
                  speak: echoable ? `Noted, thank you.` : recover.speak,
                },
              ],
              token,
            )
            if (token.cancelled) return
            await new Promise((r) => setTimeout(r, 1100))
            if (token.cancelled) return
            if (scene.recasts?.length) {
              const recast = scene.recasts[recastIdx % scene.recasts.length]
              recastIdx += 1
              await say([{ show: recast, speak: recast }], token)
              if (token.cancelled) return
            }
            prompted = true // the recast re-frames the question — don't re-ask it
            continue
          }
          Object.assign(b, patch)
          mark(() => setBrief({ ...b }))
          // each answer steers the already-running background flow
          steerFeed(scene.id, b)
          await say([{ show: scene.confirm(b).join(' '), speak: scene.confirmSpeak ? scene.confirmSpeak(b) : ackFor(i) }], token)
          answered = true
        }
      }
      if (token.cancelled) return
      finalBriefRef.current = b
      mark(() => setActiveScene(SCENES.length))
      await say(
        [
          {
            show: `${recapLine(b)} Give me about twenty seconds — running the network now.`,
            speak: `That's the brief on the record. Running the network now — give me twenty seconds.`,
          },
        ],
        token,
      )
      if (token.cancelled) return
      pushSystem(`Scanning suppliers · capability, capacity & MOQ screen at ${fmtInt(b.volume ?? ORDER_CONTEXT.volume)} units`)
      const ranked = rankSuppliers(b)
      await new Promise((r) => setTimeout(r, 2100))
      if (token.cancelled) return
      const top = topMatches(ranked, 3)
      mark(() => setMatches(top))
      push({ id: nextId(), who: 'card', type: 'matches', data: top })
      await say(
        [
          {
            show: matchAnnouncement(b, ranked),
            speak: `Top match is in — ${ranked[0].supplier.name}. Quote's coming back to this line.`,
          },
        ],
        token,
      )
      if (token.cancelled) return
      const quoted = ranked.map((r) => quoteFor(r.supplier, b)).find(Boolean)
      // the fork decision, kept for the complete-circle summary
      let forkDecision = null
      if (quoted) {
        mark(() => setQuote(quoted))
        pushSystem(`Quote received · ${quoted.supplier.name}`)
        await say(
          [
            {
              show: `Quote's in from ${quoted.supplier.name} — ${quoted.price} a unit, ${quoted.lead}. ${quoted.volumeNote}.`,
              speak: `Quote's in — ${quoted.price} a unit.`,
            },
            // flags stay on screen as text; never read aloud
            ...quoteFlags(quoted, b).map((f) => ({ show: `${f}.`, speak: null })),
          ],
          token,
        )
        if (token.cancelled) return
        // The quote fork — both paths pre-loaded so the demo never dead-ends.
        const fork = forkFor(quoted, b)
        mark(() => setForkChips(fork.chips))
        pendingAsk.current = { recasts: [fork.speak] }
        await say([{ show: fork.ask, speak: fork.speak }], token)
        if (token.cancelled) return
        let answer = null
        while (!answer) {
          const { text, via } = await waitForAnswer(token)
          if (token.cancelled) return
          if (via === 'dropped') {
            await runDropped(token, b, { show: fork.ask, speak: fork.speak })
            if (token.cancelled) return
            continue
          }
          pushYou(text, via)
          answer = parseYesNo(text)
          if (!answer) {
            await say(
              [
                {
                  show: `Of course — noted. Just a yes or a no for now, or tap one below.`,
                  speak: `Of course — noted. Just a yes or a no for me.`,
                },
              ],
              token,
            )
            if (token.cancelled) return
          }
        }
        mark(() => setForkChips(null))
        pendingAsk.current = null
        const branch = forkBranch(answer, quoted, b)
        forkDecision = {
          answer,
          label: fork.tension
            ? answer === 'yes'
              ? 'Yes — expedite requested'
              : 'No — standard schedule'
            : answer === 'yes'
              ? 'Yes — sent for acceptance'
              : 'No — terms reworked',
          feed: branch.feed,
        }
        feedEvent(branch.feed)
        await say([{ show: branch.show, speak: branch.speak }], token)
        if (token.cancelled) return
        await new Promise((r) => setTimeout(r, 1700))
        if (token.cancelled) return
        push({
          id: nextId(),
          who: 'card',
          type: 'quoteAccepted',
          data: { supplier: quoted.supplier.name, quote: quoted },
        })
        feedEvent({
          kind: 'accept',
          title: `Accepted · ${quoted.supplier.name}`,
          detail: `${quoted.price}/u · ${quoted.lead} · production slot held`,
          tone: 'ok',
        })
        await say(
          [
            {
              show: `Their ops managers reviewed the terms and accepted the quote — production slot is held for the run.`,
              speak: `Ops accepted the quote — production slot is held.`,
            },
          ],
          token,
        )
        if (token.cancelled) return
      }
      // ---- THE SHOWCASE BEAT — the call pauses on this exact line. The
      // network's full outreach run plays as a fast montage, pre-seeded from
      // the captured brief; the script does not advance while it is up. ----
      mark(() => setForkChips(null))
      await say(
        [
          {
            show: `Hold that thought — the network keeps working while we're on the line. Give me about five minutes to finish the rounds; I'll walk you through everything the moment I'm back.`,
            speak: `Hold that thought — the network keeps working while we're on the line. About five minutes — right back.`,
          },
        ],
        token,
      )
      if (token.cancelled) return
      await openShowcase(token, b)
      if (token.cancelled) return
      mark(() => resumeFromShowcase())
      // The resumed lines reflect exactly what the montage just showed —
      // accepts, the under-quote, the pass — composed from the run's data.
      const runResults = showcaseDataRef.current?.results ?? null
      const confirmed = runResults ? runResults.bySupplier.filter((o) => o.confirmed && o.quote) : []
      const quotedOnly = runResults ? runResults.bySupplier.filter((o) => o.quote && !o.confirmed) : []
      const passed = runResults ? runResults.bySupplier.filter((o) => !o.quote && o.passLine) : []
      const runParts = []
      if (confirmed.length)
        runParts.push(
          `${confirmed.map((o) => o.name).join(' and ')} confirmed at ${confirmed[0].quote.price} a unit on the ${confirmed[0].quote.lead}`,
        )
      if (quotedOnly.length)
        runParts.push(
          `${quotedOnly.map((o) => o.name).join(' and ')} on the quote sheet at ${quotedOnly.map((o) => o.quote.price).join(' and ')} a unit`,
        )
      if (passed.length) runParts.push(`${passed.map((o) => o.name).join(' and ')} passed with grace — kept warm`)
      await say(
        [
          {
            show: `Right where we left — and the run used every minute of its five: ${runParts.length ? runParts.join('; ') : 'the rounds are done'}.`,
            speak: `Right where we left — the run used its five minutes. ${confirmed.map((o) => o.name).join(' and ')} confirmed, and the warm intros landed.`,
          },
        ],
        token,
      )
      if (token.cancelled) return
      await say(
        [
          {
            show: `About the warm introductions you watched land in the run — here's the acceptance from their partner desk: a real human expecting your call.`,
            speak: `And the warm intros you watched land — here's the acceptance from their partner desk.`,
          },
        ],
        token,
      )
      if (token.cancelled) return
      await new Promise((r) => setTimeout(r, 1500))
      if (token.cancelled) return
      push({
        id: nextId(),
        who: 'card',
        type: 'introAccepted',
        data: { supplier: quoted ? quoted.supplier.name : 'the matched supplier' },
      })
      feedEvent({
        kind: 'chat',
        title: `Warm intro · ${INTRO_CONTACT.name}`,
        detail: 'Intro accepted — direct line open',
        tone: 'ok',
      })
      await say(
        [
          {
            show: `Intro's connected — ${INTRO_CONTACT.name} on their partner desk picked up. You're expected.`,
            speak: `Intro's connected. You're expected.`,
          },
        ],
        token,
      )
      if (token.cancelled) return
      const num = poNumber()
      mark(() => setPo(num))
      await new Promise((r) => setTimeout(r, 1200))
      if (token.cancelled) return
      push({
        id: nextId(),
        who: 'card',
        type: 'poConfirmed',
        data: {
          supplier: quoted ? quoted.supplier.name : 'the matched supplier',
          po: num,
          volume: b.volume ?? ORDER_CONTEXT.volume,
        },
      })
      feedEvent({
        kind: 'note',
        title: `PO ${num} confirmed`,
        detail: `${fmtInt(b.volume ?? ORDER_CONTEXT.volume)} units · shipments urgent end to end`,
        tone: 'ok',
      })
      await say(
        [
          {
            show: `Last beat — purchase order ${num} is confirmed into their schedule for the ${fmtInt(b.volume ?? ORDER_CONTEXT.volume)}-unit run, shipments flagged urgent end to end.`,
            speak: `Last beat — purchase order ${num} is confirmed. Shipments stay flagged urgent end to end.`,
          },
        ],
        token,
      )
      if (token.cancelled) return
      // Complete circle — what you said, what Aeko did with it, where it stands.
      push({
        id: nextId(),
        who: 'card',
        type: 'summary',
        data: {
          rows: briefRowsFor(b),
          fork: forkDecision?.label ?? null,
          stats: feedStatsFor(feedRef.current),
          showcase: showcaseDataRef.current?.results ?? null,
          quote: quoted,
          po: num,
          volume: b.volume ?? ORDER_CONTEXT.volume,
        },
      })
      await say(
        [
          {
            show: `That's the complete circle, ${CUSTOMER.first} — what you said, what I did with every answer, and where your order stands right now.`,
            speak: `That's the whole circle — what you said, what I did, and where your order stands.`,
          },
        ],
        token,
      )
      if (token.cancelled) return
      // The human close — flair, calendar setup, and the goodbye exchange.
      await say(
        [
          {
            show: `Hmm — that took more than a minute, but got great matches.`,
            speak: `Hmm — that took more than a minute, but got great matches.`,
          },
        ],
        token,
      )
      if (token.cancelled) return
      mark(() => setForkChips(['Yes — Monday works', "Monday's tight — move it"]))
      await say(
        [
          {
            show: `Does Monday afternoon work for a kickoff call with ${quoted.supplier.name}? If it does, I'll put it on the calendar and we get this to production.`,
            speak: `Does Monday afternoon work for a kickoff call with ${quoted.supplier.name}? If it does, I'll put it on the calendar and we get this to production.`,
          },
        ],
        token,
      )
      if (token.cancelled) return
      let calAnswer = null
      while (!calAnswer) {
        const { text, via } = await waitForAnswer(token)
        if (token.cancelled) return
        pushYou(text, via)
        calAnswer = parseYesNo(text)
        if (!calAnswer) {
          await say(
            [
              {
                show: `A yes or a no works — Monday afternoon, or shall I move it?`,
                speak: `Yes or no — Monday, or shall I move it?`,
              },
            ],
            token,
          )
          if (token.cancelled) return
        }
      }
      mark(() => setForkChips(null))
      // Both paths scripted — a tight Monday rolls to Tuesday morning.
      const slot = calAnswer === 'yes' ? 'Monday · 2:00 PM' : 'Tuesday · 10:00 AM'
      push({
        id: nextId(),
        who: 'card',
        type: 'calendar',
        data: { slot, supplier: quoted.supplier.name },
      })
      feedEvent({
        kind: 'note',
        title: `Calendar · Kickoff call with ${quoted.supplier.name}`,
        detail: `${slot} — you, their ops desk, and me`,
        tone: 'ok',
      })
      await say(
        [
          {
            show: `Done — ${slot} is on the calendar with ${quoted.supplier.name}. Let's get this to production.`,
            speak: `Done — ${slot} is on the calendar. Let's get this to production.`,
          },
        ],
        token,
      )
      if (token.cancelled) return
      mark(() => setForkChips(['Thanks, Aeko!']))
      await say(
        [
          {
            show: `That's my side done — anything else before I let you go?`,
            speak: `That's my side done — anything else before I let you go?`,
          },
        ],
        token,
      )
      if (token.cancelled) return
      let thanked = false
      while (!thanked) {
        const { text, via } = await waitForAnswer(token)
        if (token.cancelled) return
        pushYou(text, via)
        thanked = /thank/i.test(text)
        if (!thanked) {
          await say(
            [
              {
                show: `All good — whenever you're ready, ${CUSTOMER.first}.`,
                speak: `All good — whenever you're ready.`,
              },
            ],
            token,
          )
          if (token.cancelled) return
        }
      }
      mark(() => setForkChips(null))
      await say(
        [
          {
            show: `Always a pleasure — but do send them cookies when it hits production. I'll be here to notify when ${quoted.supplier.name} gets it hot off the belt. Cheers, love.`,
            speak: `Always a pleasure — but do send them cookies when it hits production. I'll be here to notify when ${quoted.supplier.name} gets it hot off the belt. Cheers, love.`,
          },
        ],
        token,
      )
      if (token.cancelled) return
      mark(() => setPhase('ended'))
    },
    [push, pushSystem, pushYou, say, steerFeed, feedEvent, openShowcase, resumeFromShowcase],
  )

  const cancelRun = useCallback(() => {
    cancelFns.current.forEach((fn) => {
      try {
        fn()
      } catch {
        /* noop */
      }
    })
    cancelFns.current = []
    stopSpeech()
  }, [stopSpeech])

  const accept = useCallback(() => {
    if (startedRef.current) return
    startedRef.current = true
    const token = { cancelled: false, cancelFns: [] }
    cancelFns.current.push(() => {
      token.cancelled = true
    })
    setPhase('live')
    run(token).catch(() => setPhase('ended'))
  }, [run])

  const decline = useCallback(() => {
    cancelRun()
    navigate('/outreach')
  }, [cancelRun, navigate])

  const endCall = useCallback(() => {
    cancelRun()
    setListening(false)
    try {
      recognitionRef.current?.stop?.()
    } catch {
      /* noop */
    }
    if (transcript.length > 2) setPhase('ended')
    else navigate('/outreach')
  }, [cancelRun, navigate, transcript.length])

  const replay = useCallback(() => {
    cancelRun()
    startedRef.current = false
    finalBriefRef.current = null
    showcaseDataRef.current = null
    setShowcase(null)
    setPhase('incoming')
    setTranscript([])
    setBrief(EMPTY_BRIEF)
    setActiveScene(null)
    setAwaiting(false)
    setMatches(null)
    setQuote(null)
    setPo(null)
    setElapsed(0)
    setInput('')
    setInterim('')
    setForkChips(null)
    feedRef.current = []
    feedClockRef.current = 0
    setFeedEvents([])
    setFeedClock(0)
  }, [cancelRun])

  // browser speech recognition — continuous, hands-free. The mic arms itself
  // the moment the call connects and re-arms after every turn, so the user
  // never presses a mic button to answer. While Aeko speaks the mic is held
  // (no self-hearing through the speakers); the moment she stops, it comes
  // back on its own. Final results submit as voice answers.
  const startListening = useCallback(() => {
    if (!asrOk) return
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    try {
      const rec = new SR()
      rec.lang = 'en-US'
      rec.interimResults = true
      rec.maxAlternatives = 1
      recognitionRef.current = rec
      rec.onresult = (e) => {
        let interimText = ''
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i]
          if (r.isFinal) {
            setInterim('')
            submit(r[0].transcript, 'voice')
            try {
              rec.stop()
            } catch {
              /* noop */
            }
            setListening(false)
            return
          }
          interimText += r[0].transcript
        }
        setInterim(interimText)
      }
      rec.onerror = (e) => {
        // permission or service failure — stop retrying; chips and typing
        // carry the demo the rest of the way
        if (e?.error === 'not-allowed' || e?.error === 'service-not-allowed') micBlockedRef.current = true
        setListening(false)
      }
      rec.onend = () => setListening(false)
      setInterim('')
      setListening(true)
      rec.start()
    } catch {
      setListening(false)
    }
  }, [asrOk, submit])

  // auto-mic driver — the mic is on whenever it's the user's turn to talk
  useEffect(() => {
    if (!asrOk || micBlockedRef.current) return undefined
    const shouldListen = phase === 'live' && !showcase && !speaking && !micMuted
    if (!shouldListen) {
      try {
        recognitionRef.current?.stop?.()
      } catch {
        /* noop */
      }
      return undefined
    }
    if (listening) return undefined
    const t = window.setTimeout(() => startListening(), 350)
    return () => clearTimeout(t)
  }, [asrOk, phase, showcase, speaking, micMuted, listening, startListening])

  // the mic button is now a mute toggle — the mic is otherwise always on
  const toggleMic = useCallback(() => {
    setMicMuted((m) => !m)
  }, [])

  const onInputKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit(input, 'text')
      setInput('')
    }
  }

  // Handoff into the /outreach run — pre-seeded from this call so the journey
  // is seamless: the pipeline lands already running, not on the launch screen.
  // Optional from the ended state — the story itself stays on this route.
  const openOutreach = () => {
    const b = finalBriefRef.current ?? EMPTY_BRIEF
    const volume = b.volume ?? ORDER_CONTEXT.volume
    const briefLine = briefLineFor(b)
    navigate('/outreach', {
      state: {
        fromLiveCall: true,
        intros: (matches ?? []).map((m) => m.supplier.name),
        supplier: quote?.supplier?.name ?? null,
        volume,
        brief: briefLine,
      },
    })
  }

  const currentScene = activeScene != null && activeScene < SCENES.length ? SCENES[activeScene] : null
  const complete = phase === 'ended'

  return (
    <div className={`lcall ${phase === 'incoming' ? 'lcall--incoming' : ''} ${complete ? 'lcall--ended' : ''}`}>
      {phase === 'incoming' && <IncomingScreen onAccept={accept} onDecline={decline} asrOk={asrOk} />}

      {phase !== 'incoming' && (
        <div className="lcall__stage">
          <header className="lcall__top">
            <div className="lcall__ident">
              <span className="lcall__pbadge lcall__pbadge--sm" aria-hidden="true">P</span>
              <div>
                <strong>{PUNKR.name}</strong>
                <span>{PUNKR.title}</span>
                <span className="lcall__with">
                  with {CUSTOMER.name} · {CUSTOMER.company}
                </span>
              </div>
              <span className={`lcall__livebadge${complete ? ' is-ended' : drop ? (drop === 'cut' ? ' is-dropped' : ' is-ringing') : ''}`}>
                <i aria-hidden="true" /> {complete ? 'ENDED' : drop === 'cut' ? 'CALL CUT' : drop === 'ringing' ? 'CALLING BACK' : 'LIVE'}
              </span>
            </div>
            <div className="lcall__controls">
              <span className="lcall__clock">{fmtClock(elapsed)}</span>
              <button
                type="button"
                className="lcall__iconbtn"
                onClick={() => setMuted((m) => !m)}
                aria-label={muted ? 'Unmute Aeko voice' : 'Mute Aeko voice'}
                title={muted ? 'Voice muted' : 'Voice on'}
              >
                {muted ? <VolumeXIcon size={15} /> : <Volume2Icon size={15} />}
              </button>
              <button type="button" className="lcall__btn lcall__btn--end" onClick={endCall}>
                <PhoneOffIcon size={15} /> {complete ? 'Leave' : 'End call'}
              </button>
            </div>
          </header>

          <div className="lcall__grid">
            <div className="lcall__main">
              <div className="lcall__agentrow">
                <div className={`call-orb ${speaking ? 'is-speaking' : ''} ${listening ? 'is-listening' : ''}`} aria-hidden="true">
                  <span className="call-orb__core">P</span>
                  <span className="call-orb__waves">
                    {[...Array(5)].map((_, i) => (
                      <i key={i} style={{ animationDelay: `${i * 0.09}s` }} />
                    ))}
                  </span>
                </div>
                <div className="lcall__agentstat">
                  <strong>
                    {speaking
                      ? 'Aeko is speaking…'
                      : listening
                        ? 'Listening — go ahead'
                        : complete
                          ? 'Call complete'
                          : 'On the line'}
                  </strong>
                  <span>
                    {currentScene
                      ? `Discovery · question ${activeScene + 1} of ${SCENES.length}`
                      : activeScene === SCENES.length || complete
                        ? 'Match · quote · handoff'
                        : 'Opening the call'}
                  </span>
                </div>
              </div>

              <div className="lcall__transcript" ref={listRef} aria-live="polite">
                {transcript.map((item) => (
                  <TranscriptItem key={item.id} item={item} />
                ))}
                {interim && (
                  <div className="bubble bubble--you bubble--interim">
                    <span className="bubble__who">{CUSTOMER.first} (you)</span>
                    <p>{interim}…</p>
                  </div>
                )}
              </div>

              <div className={`lcall__answerbar${complete ? ' lcall__answerbar--off' : ''}`}>
                {activeChips.length > 0 && (
                  <div className="call-chips">
                    {activeChips.map((c) => (
                      <button key={c} type="button" className="call-chips__chip" onClick={() => submit(c, 'chip')}>
                        {c}
                      </button>
                    ))}
                  </div>
                )}
                <div className="call-input">
                  <button
                    type="button"
                    className={`call-input__mic ${listening ? 'is-on' : ''}`}
                    onClick={toggleMic}
                    disabled={!asrOk}
                    aria-label={micMuted ? 'Turn voice input on' : 'Mute voice input'}
                    title={
                      asrOk
                        ? listening
                          ? 'Listening — click to stop'
                          : 'Answer by voice'
                        : 'Voice input needs Chrome or Edge — type instead'
                    }
                  >
                    {listening ? <AudioLinesIcon size={17} /> : <MicIcon size={17} />}
                  </button>
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={onInputKey}
                    placeholder={listening ? 'Listening…' : 'Type your answer…'}
                    aria-label="Type your answer"
                  />
                  <button
                    type="button"
                    className="call-input__send"
                    onClick={() => {
                      submit(input, 'text')
                      setInput('')
                    }}
                    disabled={!input.trim()}
                    aria-label="Send answer"
                  >
                    <SendIcon size={16} />
                  </button>
                </div>
                <p className="lcall__hint">Answer by mic or by typing — {PUNKR.name} hears both. Everything stays on this device.</p>
              </div>
            </div>

            <BriefRail
              brief={brief}
              matches={matches}
              quote={quote}
              po={po}
              elapsed={elapsed}
              phase={phase}
              feed={visibleFeed}
              feedStats={feedStats}
              liveMatches={liveMatches}
            />
          </div>

          {complete && (
            <div className="lcall__wrap">
              <div className="lcall__wrap-head">
                <CheckCircleIcon size={16} />
                <div>
                  <strong>Call with {CUSTOMER.name} wrapped — record saved to the workspace</strong>
                  <span>
                    {matches?.length ?? 0} matched · {quote ? `${quote.price}/u from ${quote.supplier.name}` : 'quote pending'} ·{' '}
                    {po ? `PO ${po} confirmed` : 'PO pending'}
                  </span>
                </div>
              </div>
              <div className="lcall__wrap-cta">
                <button type="button" className="lcall__btn lcall__btn--accept" onClick={openOutreach}>
                  <SparklesIcon size={15} /> Open the full outreach workspace
                </button>
                <button type="button" className="lcall__btn lcall__btn--ghost" onClick={reopenShowcase}>
                  <EyeIcon size={14} /> See the five-minute run — it&rsquo;s thorough
                </button>
                <button type="button" className="lcall__btn lcall__btn--ghost" onClick={() => navigate('/marketplace')}>
                  Review order in Marketplace
                </button>
                <button type="button" className="lcall__btn lcall__btn--ghost" onClick={replay}>
                  <XIcon size={14} /> Replay the call
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {showcase && (
        <ShowcaseOverlay
          list={showcase.list}
          steps={showcase.steps}
          briefLine={showcase.briefLine}
          onClose={closeShowcase}
        />
      )}
    </div>
  )
}
