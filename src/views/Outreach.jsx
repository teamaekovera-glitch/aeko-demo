import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  BRAND_CONTEXT,
  buildScript,
  foldCounts,
  partnerOutcomes,
  resolveShortlist,
  warmIntros,
} from '../data/outreach.js'
import { CUSTOMER } from '../data/punkrCall.js'
import { SAMPLE_SPEC } from '../data/suppliers.js'
import { usePlayback } from '../components/outreach/usePlayback.js'
import { buildChannels } from '../components/outreach/channels.js'
import WorkspaceBar from '../components/outreach/WorkspaceBar.jsx'
import {
  CallScreen,
  ChatScreen,
  EmailScreen,
  FormsScreen,
  IntroScreen,
  QuotesScreen,
} from '../components/outreach/ChannelScreens.jsx'
import { EndState } from '../components/outreach/EventCards.jsx'
import {
  ArrowRightIcon,
  FileTextIcon,
  PhoneIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from '../components/icons.jsx'

const HANDOFF_MS = 620

// ---------------------------------------------------------------------------
// Launch screen — the click-to-action moment. A quiet editorial campaign card:
// agent identity, the brief, the attached spec, the supplier queue. One CTA.
// ---------------------------------------------------------------------------
function LaunchScreen({ list, brief, spec, channels, total, onLaunch }) {
  const navigate = useNavigate()
  const runMinutes = Math.max(1, Math.round(total / 60))
  const channelLabels = channels.map((c) => c.label).join(' → ')
  return (
    <section className="ows-launch">
      <div className="ows-launch__texture bg-grid mask-radial" aria-hidden="true" />
      <div className="ows-launch__inner">
        <p className="ows-microlabel">
          <span className="ows-microlabel__dash" /> Aekovera Agent · Outreach workspace
        </p>
        <h1 className="ows-launch__title">
          {BRAND_CONTEXT.agent.name.split(' ')[0]} is ready to <em className="serif-accent">make your introductions.</em>
        </h1>
        <p className="ows-launch__sub">
          {list.length === 1
            ? 'One supplier, selected from your results. Dana opens the conversation, sends the spec, and reports back — right here.'
            : `${list.length} suppliers, partners first. Dana works every channel in sequence and reports back — right here.`}
        </p>

        <div className="ows-launch__card">
          <div className="ows-launch__main">
            <p className="ows-microlabel ows-microlabel--soft">The brief</p>
            <p className="ows-launch__brief">“{brief}”</p>
            <p className="ows-launch__client">
              Brand · {BRAND_CONTEXT.client} <span>({BRAND_CONTEXT.clientNote})</span>
            </p>
            <dl className="ows-launch__meta">
              {BRAND_CONTEXT.rows.map((r) => (
                <div key={r.label}>
                  <dt>{r.label}</dt>
                  <dd>{r.value}</dd>
                </div>
              ))}
            </dl>
            <div className="ows-launch__spec">
              <span className="ows-launch__spec-name">
                <FileTextIcon size={13} /> Spec sheet · {spec.name}
              </span>
              {spec.fields ? (
                <dl className="ows-launch__spec-grid">
                  {spec.fields.map((f) => (
                    <div key={f.label}>
                      <dt>{f.label}</dt>
                      <dd>{f.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="ows-launch__spec-empty">
                  Attached by you · field-level specs shared during outreach
                </p>
              )}
            </div>
          </div>

          <div className="ows-launch__queue">
            <p className="ows-microlabel ows-microlabel--soft">
              Supplier queue · {list.length} · partners first
            </p>
            <ul className="ows-queue">
              {list.map((s, i) => (
                <li key={s.id} className="ows-queue__row" style={{ '--i': i }}>
                  <span className="ows-queue__idx">{String(i + 1).padStart(2, '0')}</span>
                  <span className="ows-queue__name">{s.name}</span>
                  <span className="ows-queue__badge">{s.partner ? 'Partner' : 'Community'}</span>
                  <span className="ows-queue__score">
                    <span className="ows-queue__bar" style={{ '--w': `${s.match}%` }} />
                    {s.match}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="ows-launch__plan">
          <p className="ows-microlabel ows-microlabel--soft">Run plan · ≈ {runMinutes} min simulated</p>
          <p className="ows-launch__channels">{channelLabels}</p>
        </div>

        <div className="ows-launch__cta">
          <button type="button" className="btn btn--brand btn--xl" onClick={onLaunch}>
            Launch outreach
            <span className="btn__arrow">
              <ArrowRightIcon size={16} />
            </span>
          </button>
          <p className="ows-launch__ctanote">
            <ShieldCheckIcon size={13} /> You approved this plan — every message goes out under your
            brand’s name.
          </p>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => navigate('/outreach/live')}
          >
            <PhoneIcon size={14} /> Or take the Aeko live call
          </button>
        </div>
      </div>
    </section>
  )
}

export default function Outreach() {
  const { state } = useLocation()
  const list = useMemo(() => resolveShortlist(state), [state])
  const brief = state?.brief ?? BRAND_CONTEXT.briefPlaceholder
  const spec = state?.spec ?? SAMPLE_SPEC
  const { steps, total } = useMemo(() => buildScript(list), [list])
  // Seamless handoff from the live call: land already running, not on the launch card.
  const [launched, setLaunched] = useState(state?.fromLiveCall === true)
  const { elapsed, speed, setSpeed, instant, runId, following, done, skip, replay, seekTo } =
    usePlayback(total, { playing: launched })

  const channels = useMemo(() => buildChannels(steps), [steps])
  const counts = foldCounts(steps, elapsed)
  const outcomes = useMemo(() => partnerOutcomes(list), [list])
  const warm = useMemo(() => warmIntros(steps), [steps])

  const activeIdx = channels.reduce((acc, ch, i) => (ch.start <= elapsed ? i : acc), 0)
  const active = channels[activeIdx]
  const lastStep = steps.find((s) => s.start + (s.dur ?? 1) > elapsed) ?? steps[steps.length - 1]
  const lastSi = lastStep && lastStep.si != null ? lastStep.si : null

  // Screen handoff: keep the outgoing channel mounted for one crossfade beat.
  const prevIdRef = useRef(active?.id)
  const [leavingId, setLeavingId] = useState(null)
  useEffect(() => {
    if (!active) return
    if (prevIdRef.current === active.id) return
    setLeavingId(prevIdRef.current)
    prevIdRef.current = active.id
    const t = window.setTimeout(() => setLeavingId(null), HANDOFF_MS)
    return () => window.clearTimeout(t)
  }, [active?.id])

  // Each new screen starts at the top when the camera is following.
  useEffect(() => {
    if (!following || instant) return
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [active?.id, runId]) // eslint-disable-line react-hooks/exhaustive-deps

  const renderChannel = useCallback(
    (ch) => {
      if (!ch) return null
      switch (ch.id) {
        case 'chat':
          return <ChatScreen ch={ch} list={list} elapsed={elapsed} lastSi={lastSi} />
        case 'email':
          return <EmailScreen ch={ch} list={list} elapsed={elapsed} lastSi={lastSi} />
        case 'call':
          return <CallScreen ch={ch} list={list} elapsed={elapsed} lastSi={lastSi} />
        case 'forms':
          return <FormsScreen ch={ch} list={list} elapsed={elapsed} lastSi={lastSi} />
        case 'quotes':
          return <QuotesScreen ch={ch} list={list} elapsed={elapsed} lastSi={lastSi} />
        case 'intro':
          return (
            <IntroScreen
              ch={ch}
              elapsed={elapsed}
              done={done}
              counts={counts}
              outcomes={outcomes}
              warm={warm}
              onReplay={replay}
            />
          )
        default:
          return null
      }
    },
    [list, elapsed, lastSi, done, counts, outcomes, warm, replay],
  )

  const handleJump = useCallback(
    (t) => {
      seekTo(t)
    },
    [seekTo],
  )

  const leaving = leavingId ? channels.find((c) => c.id === leavingId) : null

  if (!launched) {
    return (
      <LaunchScreen
        list={list}
        brief={brief}
        spec={spec}
        channels={channels}
        total={total}
        onLaunch={() => setLaunched(true)}
      />
    )
  }

  return (
    <section className={`ows ${instant ? 'ows--instant' : ''}`}>
      <div className="ows__texture bg-grid" aria-hidden="true" />
      {state?.fromLiveCall && (
        <div className="ows-handoff-ribbon">
          <SparklesIcon size={12} />
          <span>
            Continuing from your call with {CUSTOMER.name} · {CUSTOMER.company} — {brief} · the pipeline is
            already running.
          </span>
        </div>
      )}
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
        onJump={handleJump}
      />

      <main className="ows__stage" key={runId}>
        {leaving && (
          <div className="ows-screen ows-screen--leaving" aria-hidden="true">
            {renderChannel(leaving)}
          </div>
        )}
        <div className="ows-screen ows-screen--active" key={active?.id ?? 'finale'}>
          {active ? (
            renderChannel(active)
          ) : (
            <EndState outcomes={outcomes} counts={counts} warm={warm} onReplay={replay} />
          )}
        </div>
        {leaving && active && (
          <div className="ows-handoff" aria-hidden="true">
            <span className="ows-handoff__label">{active.title}</span>
          </div>
        )}
      </main>
    </section>
  )
}
