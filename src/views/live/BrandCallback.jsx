// Brand side, after the admin approves: Aeko calls the brand back, presents
// the options (YES first, then MAYBE) by voice, and the options show here as
// brief cards. The brand never sees the control room.
import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../../lib/live/api.js'
import { startLiveSession, BRAND_CALLBACK_TOOLS } from '../../lib/live/session.js'
import { Waveform, fmtClock, initials, AekoMascot } from './shared.jsx'
import PackagingScene from './PackagingScene.jsx'
import { PACKAGING_OPTIONS, PACKAGING_PICK, packagingSceneInstruction } from '../../data/packagingScene.js'

const PACKAGING_TOOLS = [
  {
    name: 'show_packaging',
    description: 'Show the three packaging options on the brand screen (Aekobaba).',
    parametersJsonSchema: { type: 'object', properties: {} },
  },
  {
    name: 'focus_packaging',
    description: 'Spotlight one packaging option while talking about it.',
    parametersJsonSchema: {
      type: 'object',
      properties: { id: { type: 'string', enum: ['amazon', 'berlin', 'custom-print'] } },
      required: ['id'],
    },
  },
  {
    name: 'request_packaging_quote',
    description: 'Send a quote request to the chosen packaging supplier.',
    parametersJsonSchema: {
      type: 'object',
      properties: { id: { type: 'string', enum: ['amazon', 'berlin', 'custom-print'] } },
      required: ['id'],
    },
  },
]

const fmt = (n) => (n != null ? Number(n).toLocaleString('en-US') : null)

function OptionCard({ o, index, chosen }) {
  const isYes = o.outcome === 'YES'
  return (
    <article className={`bc-opt ${chosen ? 'is-chosen' : ''}`}>
      <header>
        <span className="bc-opt__n">Option {index + 1}</span>
        <span className={`bc-opt__tag ${isYes ? 'is-yes' : 'is-maybe'}`}>{isYes ? '✓ Can run it' : '! Can run it — timeline tight'}</span>
      </header>
      <div className="bc-opt__id">
        <span className="cr-ava cr-ava--lg cr-ava--dark">{initials(o.name)}</span>
        <div>
          <strong>{o.name}</strong>
          <span>{o.location}</span>
        </div>
      </div>
      {o.reason && <p className="bc-opt__why">“{o.reason}”</p>}
      <dl className="bc-opt__facts">
        {o.equipment?.length > 0 && (
          <div>
            <dt>Equipment</dt>
            <dd>{o.equipment.join(', ')}</dd>
          </div>
        )}
        {o.capabilities?.length > 0 && (
          <div>
            <dt>Line</dt>
            <dd>{o.capabilities.join(', ')}</dd>
          </div>
        )}
        {o.capacityPerMonth && (
          <div>
            <dt>Capacity</dt>
            <dd>{fmt(o.capacityPerMonth)} / mo</dd>
          </div>
        )}
        {o.moq && (
          <div>
            <dt>MOQ</dt>
            <dd>{fmt(o.moq)}</dd>
          </div>
        )}
      </dl>
      {(chosen || o.introSlot) && (
        <p className="bc-opt__intro">{chosen ? `✓ Intro booked · ${o.introSlot || 'Tue 10:00'}` : `Intro slot held · ${o.introSlot}`}</p>
      )}
    </article>
  )
}

export default function BrandCallback({ request, systemInstruction, onDone }) {
  const [phase, setPhase] = useState('ringing') // ringing | connecting | live | ended | error
  const [lines, setLines] = useState([])
  const [aekoLevel, setAekoLevel] = useState(0)
  const [userLevel, setUserLevel] = useState(0)
  const [chosen, setChosen] = useState(request.chosenSupplierId || null)
  const [pkgShown, setPkgShown] = useState(false)
  const [pkgFocus, setPkgFocus] = useState(null)
  const [pkgQuoted, setPkgQuoted] = useState(null)
  const pkgRef = useRef(null)
  useEffect(() => {
    if (pkgShown) pkgRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [pkgShown])
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState('')
  const sessionRef = useRef(null)
  const endingRef = useRef(false)
  const listRef = useRef(null)
  const summary = request.summary || { options: [], declined: [] }
  const options = summary.options || []

  // Ringtone while ringing.
  useEffect(() => {
    if (phase !== 'ringing') return undefined
    let ctx
    let timer
    let stopped = false
    const ring = () => {
      if (stopped) return
      try {
        ctx = ctx || new AudioContext()
        const t0 = ctx.currentTime + 0.02
        ;[440, 480].forEach((f) => {
          const o = ctx.createOscillator()
          const g = ctx.createGain()
          o.frequency.value = f
          g.gain.setValueAtTime(0.0001, t0)
          g.gain.exponentialRampToValueAtTime(0.06, t0 + 0.05)
          g.gain.setValueAtTime(0.06, t0 + 0.9)
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.0)
          o.connect(g).connect(ctx.destination)
          o.start(t0)
          o.stop(t0 + 1.05)
        })
      } catch {
        /* autoplay blocked until first click */
      }
      timer = setTimeout(ring, 2400)
    }
    ring()
    return () => {
      stopped = true
      clearTimeout(timer)
      ctx?.close?.()
    }
  }, [phase])

  useEffect(() => {
    if (phase !== 'live') return undefined
    const t = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(t)
  }, [phase])

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [lines])

  const finish = useCallback(
    async (drain) => {
      if (endingRef.current) return
      endingRef.current = true
      const s = sessionRef.current
      sessionRef.current = null
      if (s) {
        if (drain) await s.drain(7000)
        await s.stop()
      }
      api.callbackUpdate(request.id, { status: 'DONE' }).catch(() => {})
      setPhase('ended')
    },
    [request.id],
  )

  const accept = async () => {
    setPhase('connecting')
    try {
      await api.callbackUpdate(request.id, { status: 'CALLING' })
      sessionRef.current = await startLiveSession({
        purpose: 'brand_intake',
        systemInstruction: systemInstruction + packagingSceneInstruction({ product: request.product || 'stuffed cookies' }),
        tools: [...BRAND_CALLBACK_TOOLS, ...PACKAGING_TOOLS],
        kickoff: 'The founder just picked up your call. Greet them and give them the news now.',
        onState: (st, detail) => {
          if (st === 'live' || st === 'speaking' || st === 'listening') setPhase('live')
          if (st === 'error') setError(detail || 'Voice connection error')
          if (st === 'ended' && !endingRef.current) finish(false)
        },
        onAekoLevel: setAekoLevel,
        onUserLevel: setUserLevel,
        onTranscript: ({ speaker, text, final }) => {
          setLines((prev) => {
            const next = [...prev]
            const last = next[next.length - 1]
            if (last && last.speaker === speaker && !last.final) next[next.length - 1] = { speaker, text, final }
            else next.push({ speaker, text, final })
            return next
          })
        },
        onToolCall: async (name, args) => {
          if (name === 'choose_option') {
            const id = String(args.supplierId || '')
            const match = options.find((o) => o.supplierId === id) || options[0]
            if (match) {
              setChosen(match.supplierId)
              await api.callbackUpdate(request.id, { chosenSupplierId: match.supplierId })
            }
            return { ok: true, chosen: match?.name, introSlot: match?.introSlot || 'Tue 10:00' }
          }
          if (name === 'show_packaging') {
            setPkgShown(true)
            return { ok: true, options: PACKAGING_OPTIONS.map((o) => ({ id: o.id, name: o.name, seller: o.seller, price: o.unitPrice })) }
          }
          if (name === 'focus_packaging') {
            setPkgShown(true)
            setPkgFocus(String(args.id || ''))
            return { ok: true }
          }
          if (name === 'request_packaging_quote') {
            const id = PACKAGING_OPTIONS.some((o) => o.id === args.id) ? args.id : PACKAGING_PICK
            setPkgShown(true)
            setPkgFocus(id)
            setPkgQuoted(id)
            return { ok: true, sentTo: PACKAGING_OPTIONS.find((o) => o.id === id)?.seller }
          }
          if (name === 'end_call') {
            setTimeout(() => finish(true), 50)
            return { ok: true }
          }
          return { ok: false }
        },
      })
    } catch (err) {
      setError(err?.message || 'Could not start the call')
      setPhase('error')
    }
  }

  const chosenOpt = options.find((o) => o.supplierId === chosen)

  return (
    <section className="results">
      <div className="results__inner bc">
        <p className="eyebrow">
          <span className="eyebrow__dash" /> Aeko · Your makers are ready
        </p>
        <h1 className="results__title">
          {summary.callsMade || options.length} calls made · <em className="serif-accent">{options.length} can run your {request.product || 'product'}</em>
        </h1>

        {phase === 'ringing' && (
          <div className="bc-ring">
            <AekoMascot size={110} listening />
            <div>
              <p className="lcall__microlabel">Incoming call · Aeko · Aekovera</p>
              <strong>Aeko is calling you back</strong>
            </div>
            <button type="button" className="lcall__btn lcall__btn--accept" onClick={accept}>
              Accept call
            </button>
          </div>
        )}

        {phase !== 'ringing' && (
          <div className="bc-call">
            <AekoMascot level={aekoLevel} listening={userLevel > 0.08} size={110} />
            <div className="bc-call__mid">
              <div className="bc-call__head">
                <strong>Aeko</strong>
                <span className={`sp__live sp__live--${phase}`}>
                  <i />
                  {phase === 'connecting' ? 'CONNECTING' : phase === 'live' ? `LIVE ${fmtClock(elapsed)}` : phase === 'error' ? 'ERROR' : 'CALL ENDED'}
                </span>
              </div>
              <Waveform level={Math.max(aekoLevel, userLevel)} tone="brand" />
              <div className="bc-call__lines" ref={listRef}>
                {lines.slice(-4).map((l, i) => (
                  <p key={i} className={`vi__line vi__line--${l.speaker}${l.final ? '' : ' is-partial'}`}>
                    <span>{l.speaker === 'aeko' ? 'Aeko' : 'You'}</span> {l.text}
                  </p>
                ))}
              </div>
            </div>
            {phase === 'live' && (
              <button type="button" className="lcall__btn lcall__btn--decline" onClick={() => finish(false)}>
                Hang up
              </button>
            )}
          </div>
        )}
        {error && <p className="live-error">{error}</p>}

        {pkgShown && (
          <div ref={pkgRef}>
            <PackagingScene brandCompany={request.brandCompany} focusId={pkgFocus} quotedId={pkgQuoted} />
          </div>
        )}

        <div className={`bc-opts ${pkgShown ? 'bc-opts--compact' : ''}`}>
          {options.map((o, i) => (
            <OptionCard key={o.supplierId} o={o} index={i} chosen={chosen === o.supplierId} />
          ))}
        </div>

        {summary.declined?.length > 0 && (
          <p className="bc-declined">
            Also called: {summary.declined.map((d) => `${d.name} (${d.reason})`).join(' · ')} — saved to the network.
          </p>
        )}

        {phase === 'ended' && (
          <div className="lb__aeko">
            <span className="lb__orb">Æ</span>
            <p>
              <strong>Aeko</strong>
              {chosenOpt
                ? `Intro booked with ${chosenOpt.name} · ${chosenOpt.introSlot || 'Tue 10:00'}. The spec sheet is on its way to them.${pkgQuoted ? ` Packaging quote requested from ${PACKAGING_OPTIONS.find((o) => o.id === pkgQuoted)?.seller}.` : ''}`
                : 'Call wrapped — your options are saved here.'}
            </p>
          </div>
        )}
        {phase === 'ended' && onDone && (
          <div className="lb__actions">
            <button type="button" className="btn btn--ghost" onClick={onDone}>
              New brief
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
