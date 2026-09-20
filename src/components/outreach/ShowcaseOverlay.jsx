// In-call outreach showcase — the time-skip montage. The live call pauses
// mid-line; the automated outreach run (pre-seeded from the customer's
// captured brief) plays full-screen at montage pace, reusing the workspace's
// own run components (channel screens, workspace bar, playback engine).
// Framing card → run → "five minutes later" digest → back to the call
// exactly where it left. Fully simulated and local; nothing is ever sent.
import { useEffect, useMemo, useRef, useState } from 'react'
import { buildChannels } from './channels.js'
import { foldCounts, showcaseResults } from '../../data/outreach.js'
import { usePlayback } from './usePlayback.js'
import WorkspaceBar from './WorkspaceBar.jsx'
import { ChannelScreen } from './ChannelScreens.jsx'
import StormScreen from './StormScreens.jsx'
import {
  CheckCircleIcon,
  FastForwardIcon,
  MailIcon,
  PhoneIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from '../icons.jsx'
import { CUSTOMER } from '../../data/punkrCall.js'

// Channels the montage renders as parallel storm beats (four tiles at once)
// instead of the workspace's sequential per-supplier screens. Quotes and
// warm-intros keep the workspace screens in both surfaces.
const STORM_CHANNELS = new Set(['chat', 'email', 'call', 'forms'])

// Montage pacing: aim ~26s at the default pace (band 20–35s), snapped to the
// Pace slider's 0.25× steps and clamped inside its 0.5×–4× range.
const montageSpeed = (total) => Math.min(4, Math.max(1.15, Math.ceil((total / 40) * 4) / 4))

const FRAMING_MS = 4200
const RUN_SETTLE_MS = 1500
const DIGEST_MS = 6500

function outcomeFor(o) {
  if (o.confirmed && o.quote) return `${o.quote.price}/u · ${o.quote.lead} — accepted, project confirmed`
  if (o.quote) return `${o.quote.price}/u · ${o.quote.lead} — quote on file`
  if (o.passLine) return 'Graceful pass — kept warm, no spec sent'
  return 'Brief delivered — follow-up scheduled'
}

function outcomeIcon(o) {
  if (o.confirmed) return <CheckCircleIcon size={13} />
  if (o.quote) return <MailIcon size={13} />
  if (o.passLine) return <ShieldCheckIcon size={13} />
  return <SparklesIcon size={13} />
}

// Narration for the run — one readable line per channel, and the two
// scenarios that deserve a voice actually speak (call pitch, forms fill).
const CAPTIONS = {
  chat: 'First pass — quick intros on chat while the queue is fresh.',
  email: 'Now every supplier who matched our requirements gets a proper email — the strategic search already picked the list.',
  call: 'And for the ones worth a live voice — the agent picks up the phone.',
  forms: 'Some people just don’t pick up phones, so we fill their contact forms online — fastest response time there is.',
  quotes: 'Quotes come back — price, lead time, certifications, side by side.',
  intro: 'Warm intros to close — partners answering for partners.',
}
const SPOKEN = {
  call: 'Hi, Aeko with Aekovera here — your pouch line matched on a five hundred thousand unit cookie order. Can you quote on a pilot basis?',
  forms:
    'Some people just don’t pick up phones, so we fill their contact forms online. Fastest response time there is.',
}

export default function ShowcaseOverlay({ list, steps, briefLine, onClose }) {
  // framing → run → digest — the montage's own three beats
  const [phase, setPhase] = useState('framing')
  const total = useMemo(() => steps.reduce((t, s) => Math.max(t, s.start + (s.dur ?? 1)), 0), [steps])
  const initialSpeed = useMemo(() => montageSpeed(total), [total])
  const { elapsed, speed, setSpeed, instant, runId, following, done, skip, replay, seekTo } =
    usePlayback(total, { playing: phase === 'run', initialSpeed })

  const channels = useMemo(() => buildChannels(steps), [steps])
  const counts = foldCounts(steps, elapsed)
  const results = useMemo(() => showcaseResults(steps, list), [steps, list])

  const activeIdx = channels.reduce((acc, ch, i) => (ch.start <= elapsed ? i : acc), 0)
  const active = channels[activeIdx]
  const lastStep = steps.find((s) => s.start + (s.dur ?? 1) > elapsed) ?? steps[steps.length - 1]
  const lastSi = lastStep && lastStep.si != null ? lastStep.si : null

  // Each narration line is spoken once per overlay lifetime; speech cancels
  // on close so the resumed call starts with a clear channel.
  const spokenRef = useRef({})
  useEffect(() => {
    if (phase !== 'run') return undefined
    const line = SPOKEN[active?.id]
    if (!line || spokenRef.current[active.id]) return undefined
    spokenRef.current[active.id] = true
    try {
      const u = new SpeechSynthesisUtterance(line)
      u.lang = 'en-US'
      u.rate = 1.04
      window.speechSynthesis?.speak(u)
    } catch {
      /* speech unavailable — captions still carry it */
    }
    return undefined
  }, [phase, active?.id])
  useEffect(
    () => () => {
      try {
        window.speechSynthesis?.cancel()
      } catch {
        /* noop */
      }
    },
    [],
  )

  useEffect(() => {
    if (phase !== 'framing') return undefined
    const t = window.setTimeout(() => setPhase('run'), FRAMING_MS)
    return () => window.clearTimeout(t)
  }, [phase])

  useEffect(() => {
    if (phase !== 'run' || !done) return
    const t = window.setTimeout(() => setPhase('digest'), RUN_SETTLE_MS)
    return () => window.clearTimeout(t)
  }, [phase, done])

  useEffect(() => {
    if (phase !== 'digest') return undefined
    const t = window.setTimeout(() => onClose('done'), DIGEST_MS)
    return () => window.clearTimeout(t)
  }, [phase, onClose])

  return (
    <div className="lshow" role="dialog" aria-label="Automated outreach run — simulated montage">
      <div className="lshow__texture bg-grid" aria-hidden="true" />
      <button type="button" className="cold__skip lshow__skip" onClick={() => onClose('skip')}>
        Skip — back to the call <FastForwardIcon size={13} />
      </button>

      {phase === 'framing' && (
        <div className="lshow__center">
          <div className="lshow__card">
            <p className="lshow__microlabel">
              <span className="lshow__livedot" aria-hidden="true" /> Live call with {CUSTOMER.name} ·
              holding on the line
            </p>
            <h2 className="lshow__title">
              While you&rsquo;re still on the line —{' '}
              <em className="serif-accent">the next 5 minutes, automated.</em>
            </h2>
            <p className="lshow__sub">
              &ldquo;{briefLine}&rdquo; — the brief {CUSTOMER.first} confirmed on the call drives
              every touch. The network works the rounds; neither of you leaves the line.
            </p>

            <p className="lshow__microlabel lshow__microlabel--stack">
              Supplier queue · {list.length} · partners first
            </p>
            <ul className="lshow__queue">
              {list.map((s, i) => (
                <li key={s.id} className="lshow__row">
                  <span className="lshow__row-idx">{String(i + 1).padStart(2, '0')}</span>
                  <span className="lshow__row-name">{s.name}</span>
                  <span
                    className={`lshow__row-badge${s.partner ? '' : ' lshow__row-badge--community'}`}
                  >
                    {s.partner ? 'Partner' : 'Community'}
                  </span>
                  <span className="lshow__row-score">
                    <span className="lshow__row-bar" aria-hidden="true">
                      <i style={{ '--w': `${s.match}%` }} />
                    </span>
                    {s.match}%
                  </span>
                </li>
              ))}
            </ul>

            <p className="lshow__note">
              Chat · email · voice · forms · quotes — played at montage pace, ~
              {Math.max(1, Math.round(total / initialSpeed))}s at default.
            </p>
          </div>
        </div>
      )}

      {phase !== 'framing' && (
        <div className="lshow__run">
          <WorkspaceBar
            channels={channels}
            activeId={active?.id}
            elapsed={elapsed}
            total={total}
            counts={counts}
            supplierCount={list.length}
            speed={speed}
            setSpeed={setSpeed}
            done={done}
            skip={skip}
            replay={replay}
            onJump={seekTo}
          />
          <main className="lshow__stage">
            <div className="ows-screen ows-screen--active" key={active?.id ?? 'finale'}>
              {active &&
                (STORM_CHANNELS.has(active.id) ? (
                  <StormScreen ch={active} list={list} elapsed={elapsed} />
                ) : (
                  <ChannelScreen
                    ch={active}
                    channels={channels}
                    list={list}
                    elapsed={elapsed}
                    instant={instant}
                    following={following}
                    lastSi={lastSi}
                    counts={counts}
                    outcomes={[]}
                    warm={[]}
                    done={false}
                    onReplay={replay}
                  />
                ))}
            </div>
          </main>
          <p className="lshow__caption" key={active?.id ?? 'cap'} aria-live="polite">
            {CAPTIONS[active?.id] ?? ''}
          </p>
        </div>
      )}

      {phase === 'digest' && (
        <div className="lshow__center lshow__center--digest">
          <div className="lshow__card lshow__card--digest">
            <p className="lshow__microlabel">
              <span className="lshow__livedot" aria-hidden="true" /> Five minutes later · run
              complete
            </p>
            <h2 className="lshow__title">
              The network did the work — <em className="serif-accent">you never left the line.</em>
            </h2>
            <ul className="lshow__outcomes">
              {results.bySupplier.map((o) => (
                <li key={o.id} className={`lshow__outcome${o.confirmed ? ' lshow__outcome--ok' : ''}`}>
                  <span className="lshow__outcome-icon" aria-hidden="true">
                    {outcomeIcon(o)}
                  </span>
                  <strong>{o.name}</strong>
                  <span className="lshow__outcome-why">{outcomeFor(o)}</span>
                </li>
              ))}
            </ul>
            <div className="lshow__counts">
              <span>
                <strong>{results.counts.contacted}</strong> contacted
              </span>
              <span>
                <strong>{results.counts.replies}</strong> replies
              </span>
              <span>
                <strong>{results.counts.quotes}</strong> quotes
              </span>
              <span>
                <strong>{results.counts.confirmed}</strong> confirmed
              </span>
            </div>
            {results.warm.length > 0 && (
              <p className="lshow__warm">
                <SparklesIcon size={12} /> Warm introductions delivered —{' '}
                {results.warm.map((w) => w.supplierName).join(' & ')}
              </p>
            )}
            <div className="lshow__digest-actions">
              <button type="button" className="btn btn--brand btn--lg" onClick={() => onClose('done')}>
                <PhoneIcon size={15} /> Back to the call — resume with {CUSTOMER.first}
              </button>
            </div>
            <span className="lshow__auto" aria-hidden="true">
              <i style={{ animationDuration: `${DIGEST_MS}ms` }} />
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
