// Supplier laptop. Logged-in supplier waits; when Aeko dials, the portal
// rings; on Accept the browser opens a Gemini Live session (Aeko's voice) and
// streams transcript + levels to the control room over Supabase Broadcast.
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, getStoredUser } from '../../lib/live/api.js'
import { openBroadcaster } from '../../lib/live/realtime.js'
import { startLiveSession, SUPPLIER_CALL_TOOLS } from '../../lib/live/session.js'
import { Waveform, fmtClock, LANG_LABEL, AekoMascot } from './shared.jsx'

function useRingtone(on) {
  useEffect(() => {
    if (!on) return undefined
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
  }, [on])
}

export default function SupplierPortal() {
  const navigate = useNavigate()
  const user = getStoredUser()
  const [incoming, setIncoming] = useState(null)
  const [phase, setPhase] = useState('idle') // idle | ringing | connecting | live | ended | error
  const [lines, setLines] = useState([]) // [{ speaker, text, final }]
  const [aekoLevel, setAekoLevel] = useState(0)
  const [userLevel, setUserLevel] = useState(0)
  const [outcome, setOutcome] = useState(null)
  const [error, setError] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [micMuted, setMicMuted] = useState(false)
  const [lang, setLang] = useState(null)
  const sessionRef = useRef(null)
  const bcRef = useRef(null)
  const callRef = useRef(null)
  const declinedRef = useRef(new Set())
  const endingRef = useRef(false)
  const listRef = useRef(null)

  useEffect(() => {
    if (!user || user.role !== 'SUPPLIER') navigate('/login?next=/supplier', { replace: true })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Poll for an incoming call while idle.
  useEffect(() => {
    if (phase !== 'idle') return undefined
    let stop = false
    const tick = async () => {
      try {
        const { call } = await api.incomingCall()
        if (!stop && call && call.status === 'RINGING' && !declinedRef.current.has(call.id)) {
          setIncoming(call)
          setPhase('ringing')
          return
        }
      } catch (err) {
        if (err.status === 401) navigate('/login?next=/supplier', { replace: true })
      }
      if (!stop) setTimeout(tick, 1500)
    }
    tick()
    return () => {
      stop = true
    }
  }, [phase, navigate])

  useRingtone(phase === 'ringing')

  useEffect(() => {
    if (phase !== 'live') return undefined
    const t = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(t)
  }, [phase])

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [lines])

  // Throttled level broadcast for the control room waveform.
  const lastLevelSent = useRef(0)
  const sendLevel = useCallback((speaker, level) => {
    const now = performance.now()
    if (now - lastLevelSent.current < 120) return
    lastLevelSent.current = now
    const id = callRef.current?.id
    if (id) bcRef.current?.send('level', { callId: id, speaker, level })
  }, [])

  const finish = useCallback(async (reason) => {
    if (endingRef.current) return
    endingRef.current = true
    const s = sessionRef.current
    sessionRef.current = null
    if (s) {
      if (reason === 'tool') await s.drain(6000)
      await s.stop()
    }
    const id = callRef.current?.id
    if (id) {
      try {
        await api.endCall(id)
      } catch {
        /* already ended */
      }
      bcRef.current?.send('transcript', { callId: id, speaker: 'system', text: 'Call ended', final: true })
    }
    bcRef.current?.close()
    bcRef.current = null
    setPhase('ended')
  }, [])

  const accept = async () => {
    const call = incoming
    callRef.current = call
    endingRef.current = false
    setPhase('connecting')
    setLines([])
    setElapsed(0)
    setOutcome(null)
    setError('')
    try {
      await api.acceptCall(call.id)
      const [{ systemInstruction }, bc] = await Promise.all([api.liveContext(call.id), openBroadcaster()])
      bcRef.current = bc
      sessionRef.current = await startLiveSession({
        purpose: 'supplier_call',
        callId: call.id,
        systemInstruction,
        tools: SUPPLIER_CALL_TOOLS,
        kickoff: 'The supplier just picked up the phone. Greet them and start now.',
        onState: (st, detail) => {
          if (st === 'live' || st === 'speaking' || st === 'listening') setPhase('live')
          if (st === 'error') setError(detail || 'Voice connection error')
          if (st === 'ended' && !endingRef.current) finish('remote')
        },
        onAekoLevel: (l) => {
          setAekoLevel(l)
          if (l > 0.02) sendLevel('aeko', l)
        },
        onUserLevel: (l) => {
          setUserLevel(l)
          if (l > 0.02) sendLevel('supplier', l)
        },
        onTranscript: ({ speaker, text, final }) => {
          const who = speaker === 'user' ? 'supplier' : 'aeko'
          setLines((prev) => {
            const next = [...prev]
            const last = next[next.length - 1]
            if (last && last.speaker === who && !last.final) next[next.length - 1] = { speaker: who, text, final }
            else next.push({ speaker: who, text, final })
            return next
          })
          bc.send('transcript', { callId: call.id, speaker: who, text, final })
          if (final) api.callEvent(call.id, { kind: 'transcript', speaker: who, text }).catch(() => {})
        },
        onToolCall: async (name, args) => {
          if (name === 'record_outcome') {
            const payload = {
              outcome: String(args.outcome || 'MAYBE').toUpperCase(),
              reason: args.reason || '',
              language: args.language || 'en',
            }
            setOutcome(payload)
            setLang(payload.language)
            const { call: updated } = await api.callOutcome(call.id, payload)
            bc.send('transcript', {
              callId: call.id,
              speaker: 'system',
              text: `Outcome · ${payload.outcome} · ${payload.reason}`,
              final: true,
            })
            return { ok: true, introSlot: updated?.introSlot || null }
          }
          if (name === 'end_call') {
            setTimeout(() => finish('tool'), 50)
            return { ok: true }
          }
          return { ok: false, error: 'unknown tool' }
        },
      })
    } catch (err) {
      setError(err?.message || 'Could not start the call')
      setPhase('error')
    }
  }

  const decline = async () => {
    declinedRef.current.add(incoming.id)
    try {
      await api.endCall(incoming.id)
    } catch {
      /* noop */
    }
    setIncoming(null)
    setPhase('idle')
  }

  const toggleMute = () => {
    setMicMuted((m) => {
      sessionRef.current?.setMicMuted(!m)
      return !m
    })
  }

  const supplier = incoming?.supplier
  const req = incoming?.request
  const company = supplier?.name || user?.company || 'Your company'

  return (
    <section className="sp">
      <header className="sp__top">
        <div className="sp__brand">
          <span className="brand__mark brand__mark--sm" aria-hidden="true">
            <span className="brand__mark-glyph">Æ</span>
          </span>
          <div>
            <strong>{company}</strong>
            <span>Supplier portal · {user?.email}</span>
          </div>
        </div>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={async () => {
            await api.logout().catch(() => {})
            navigate('/login')
          }}
        >
          Sign out
        </button>
      </header>

      {phase === 'idle' && (
        <div className="sp__idle">
          <div className="sp__pulse" aria-hidden="true" />
          <h1>Online · waiting for calls</h1>
          <p>Keep this tab open. When Aeko calls about a project, it rings here.</p>
        </div>
      )}

      {phase === 'ringing' && incoming && (
        <div className="sp__ring">
          <AekoMascot size={180} listening />
          <p className="lcall__microlabel">Incoming call · Aeko · Aekovera sourcing agent</p>
          <h1 className="lcall__caller">Aeko is calling {company}</h1>
          {req && (
            <p className="lcall__context">
              Re: <strong>{req.volume ? `${Number(req.volume).toLocaleString()} ` : ''}{req.product || req.category}</strong>
            </p>
          )}
          <div className="lcall__incoming-actions">
            <button type="button" className="lcall__btn lcall__btn--decline" onClick={decline}>
              Decline
            </button>
            <button type="button" className="lcall__btn lcall__btn--accept" onClick={accept}>
              Accept call
            </button>
          </div>
        </div>
      )}

      {(phase === 'connecting' || phase === 'live' || phase === 'ended' || phase === 'error') && (
        <div className="sp__call">
          <div className="sp__callhead">
            <AekoMascot level={aekoLevel} listening={userLevel > 0.08} size={96} />
            <div className="sp__callid">
              <strong>Aeko</strong>
              <span>Aekovera sourcing agent</span>
            </div>
            <span className={`sp__live sp__live--${phase}`}>
              <i />
              {phase === 'connecting' ? 'CONNECTING' : phase === 'live' ? `LIVE ${fmtClock(elapsed)}` : phase === 'error' ? 'ERROR' : 'ENDED'}
            </span>
            {lang && <span className="sp__lang">{LANG_LABEL[lang] || lang}</span>}
          </div>
          <div className="sp__waves">
            <Waveform level={aekoLevel} tone="brand" label="Aeko" />
            <Waveform level={userLevel} tone="ink" label="You" />
          </div>
          <div className="sp__transcript" ref={listRef}>
            {lines.length === 0 && <p className="sp__hint">{phase === 'connecting' ? 'Connecting…' : 'Aeko is about to speak…'}</p>}
            {lines.map((l, i) => (
              <div key={i} className={`sp__line sp__line--${l.speaker}${l.final ? '' : ' is-partial'}`}>
                <span>{l.speaker === 'aeko' ? 'Aeko' : 'You'}</span>
                <p>{l.text}</p>
              </div>
            ))}
          </div>
          {outcome && (
            <div className={`sp__outcome sp__outcome--${outcome.outcome.toLowerCase()}`}>
              {outcome.outcome === 'YES' ? '✓' : outcome.outcome === 'NO' ? '✕' : '!'} {outcome.outcome} · {outcome.reason}
            </div>
          )}
          {error && <p className="live-error">{error}</p>}
          <div className="sp__controls">
            {phase === 'live' && (
              <>
                <button type="button" className="btn btn--ghost" onClick={toggleMute}>
                  {micMuted ? 'Unmute mic' : 'Mute mic'}
                </button>
                <button type="button" className="lcall__btn lcall__btn--decline" onClick={() => finish('user')}>
                  Hang up
                </button>
              </>
            )}
            {(phase === 'ended' || phase === 'error') && (
              <button
                type="button"
                className="btn btn--brand"
                onClick={() => {
                  setIncoming(null)
                  setPhase('idle')
                }}
              >
                Back to waiting
              </button>
            )}
          </div>
        </div>
      )}

      {supplier?.talkingPoints && phase !== 'idle' && (
        <aside className="sp__cheat">
          <p>Your role (demo)</p>
          <strong>{supplier.talkingPoints}</strong>
        </aside>
      )}
    </section>
  )
}
