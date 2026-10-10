// The control room (monitor laptop): Aeko matches the brief against the
// supplier database, dials the top suppliers, and every call plays out live —
// transcripts stream in over Supabase Broadcast from the supplier laptops,
// call status/outcomes arrive via postgres_changes (+ polling fallback).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { api, getStoredUser } from '../../lib/live/api.js'
import { listen } from '../../lib/live/realtime.js'
import { Waveform, fmtClock, initials, camel, LANG_LABEL } from './shared.jsx'

const MATCH_STEPS = [
  'Reading your brief',
  'Understanding what you need',
  'Matching by meaning across the network',
  'Re-ranking the closest makers',
]

function specialtyRows(request) {
  const sp = request?.specialty || {}
  const rows = []
  if (request?.product) rows.push(['Product', request.product])
  if (request?.volume) rows.push(['Volume', `${Number(request.volume).toLocaleString()} units`])
  const eq = Array.isArray(sp.equipment) ? sp.equipment.join(', ') : sp.equipment
  if (eq) rows.push(['Equipment', eq])
  const reqs = sp.line || sp.requirements || sp.capabilities
  const line = Array.isArray(reqs) ? reqs.join(', ') : reqs
  if (line) rows.push(['Line', line])
  if (sp.packaging) rows.push(['Packaging', sp.packaging])
  if (request?.deadline) rows.push(['Ship by', request.deadline])
  if (rows.length < 3 && request?.category) rows.push(['Category', request.category])
  return rows
}

function useShipWindow() {
  const start = useRef(Date.now())
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const left = 41 * 86400 + 22 * 3600 + 14 * 60 + 8 - Math.floor((now - start.current) / 1000)
  const d = Math.floor(left / 86400)
  const h = String(Math.floor((left % 86400) / 3600)).padStart(2, '0')
  const m = String(Math.floor((left % 3600) / 60)).padStart(2, '0')
  const s = String(left % 60).padStart(2, '0')
  return `${d}d ${h}:${m}:${s}`
}

function CallTile({ call, live: liveIn, now }) {
  // Realtime broadcast first; API fields (lastAeko/lastSupplier) as polling fallback.
  const live = {
    ...liveIn,
    aeko: liveIn?.aeko || call.lastAeko,
    supplier: liveIn?.supplier || call.lastSupplier,
  }
  const s = call.supplier || {}
  const outcome = call.outcome
  const started = call.startedAt ? new Date(call.startedAt).getTime() : null
  const secs = started ? Math.max(0, Math.floor(((call.endedAt ? new Date(call.endedAt).getTime() : now) - started) / 1000)) : 0
  const state =
    outcome === 'YES' ? 'yes' : outcome === 'NO' ? 'no' : outcome === 'MAYBE' ? 'maybe' : call.status === 'RINGING' ? 'ringing' : call.status === 'CONNECTED' ? 'live' : call.status === 'MISSED' ? 'missed' : 'ended'
  const level = Math.max(live?.aekoLevel || 0, live?.supplierLevel || 0)
  const lang = call.language || live?.lang
  return (
    <article className={`cr-tile cr-tile--${state}`}>
      <header className="cr-tile__head">
        <span className="cr-ava">{initials(s.name)}</span>
        <div className="cr-tile__id">
          <strong>{s.name}</strong>
          <span>{s.location}</span>
        </div>
        {lang && lang !== 'en' && <span className="cr-lang">{LANG_LABEL[lang] || lang}</span>}
        <span className="cr-status">
          <i />
          {state === 'ringing' ? 'RINGING' : state === 'live' ? `LIVE ${fmtClock(secs)}` : state === 'missed' ? 'NO ANSWER' : `ENDED ${fmtClock(secs)}`}
        </span>
      </header>
      <Waveform level={state === 'live' ? level : 0} tone={state === 'yes' ? 'ok' : state === 'no' ? 'bad' : 'brand'} bars={44} />
      <div className="cr-tile__lines">
        {live?.aeko && (
          <p className="cr-q">
            <em>AEKO</em> {live.aeko}
          </p>
        )}
        {live?.supplier ? (
          <p className="cr-a">{live.supplier}</p>
        ) : (
          state === 'ringing' && <p className="cr-dim">Dialing…</p>
        )}
      </div>
      <footer className="cr-tile__foot">
        {outcome ? (
          <span className={`cr-chip cr-chip--${state}`}>
            {state === 'yes' ? '✓' : state === 'no' ? '✕' : '!'} {call.outcomeReason || outcome}
          </span>
        ) : state === 'live' ? (
          <span className="cr-dim">● {live?.supplierLevel > 0.05 ? 'LISTENING' : 'CHECKING AGAINST BRIEF'}</span>
        ) : null}
        {outcome === 'NO' && <span className="cr-saved">Saved to network · {call.outcomeReason}</span>}
        {outcome === 'YES' && call.introSlot && <span className="cr-chip cr-chip--intro">Intro · {call.introSlot}</span>}
      </footer>
    </article>
  )
}

export default function ControlRoom() {
  const { requestId: routeId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const autoRun = location.state?.run === true
  const user = getStoredUser()
  const [requestId, setRequestId] = useState(routeId || null)
  const [request, setRequest] = useState(null)
  const [matches, setMatches] = useState([])
  const [scanned, setScanned] = useState(null)
  const [calls, setCalls] = useState([])
  const [live, setLive] = useState({}) // callId → { aeko, supplier, aekoLevel, supplierLevel, lang }
  const [stepIdx, setStepIdx] = useState(-1)
  const [error, setError] = useState('')
  const [now, setNow] = useState(Date.now())
  const shipWindow = useShipWindow()
  const dialing = useRef(false)

  useEffect(() => {
    if (!user) navigate(`/login?next=${encodeURIComponent(window.location.pathname)}`, { replace: true })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const refresh = useCallback(async () => {
    try {
      let id = routeId || requestId
      if (!routeId) {
        // Monitor mode: always follow the newest request (made on the brand laptop).
        const { requests } = await api.listRequests()
        const newest = [...(requests || [])].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0]
        if (newest && newest.id !== requestId) {
          id = newest.id
          setRequestId(newest.id)
          setMatches([])
          setCalls([])
          setLive({})
          setStepIdx(-1)
        }
      }
      if (!id) return
      const data = await api.getRequest(id)
      setRequest(data.request)
      if (data.matches?.length) setMatches(data.matches)
      setCalls(data.calls || [])
    } catch (err) {
      if (err.status === 401) navigate(`/login?next=${encodeURIComponent(window.location.pathname)}`, { replace: true })
    }
  }, [routeId, requestId, navigate])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Realtime wiring.
  useEffect(() => {
    return listen({
      onPoll: refresh,
      onTranscript: (p) => {
        if (!p?.callId || p.speaker === 'system') return
        setLive((prev) => {
          const cur = prev[p.callId] || {}
          return { ...prev, [p.callId]: { ...cur, [p.speaker]: p.text } }
        })
      },
      onLevel: (p) => {
        if (!p?.callId) return
        setLive((prev) => {
          const cur = prev[p.callId] || {}
          return { ...prev, [p.callId]: { ...cur, [`${p.speaker}Level`]: p.level, [`${p.speaker}At`]: Date.now() } }
        })
      },
      onCallChange: (row) => {
        if (!row?.id) return
        const c = camel(row)
        setCalls((prev) => prev.map((x) => (x.id === c.id ? { ...x, ...c, supplier: x.supplier, request: x.request } : x)))
      },
      onRequestChange: (row) => {
        if (row?.id && row.id === requestId) setRequest((r) => ({ ...r, ...camel(row) }))
      },
    })
  }, [refresh, requestId])

  // Decay stale levels so waveforms settle when nobody talks.
  useEffect(() => {
    setLive((prev) => {
      let changed = false
      const out = {}
      for (const [k, v] of Object.entries(prev)) {
        const n = { ...v }
        if (n.aekoAt && Date.now() - n.aekoAt > 400 && n.aekoLevel) {
          n.aekoLevel = 0
          changed = true
        }
        if (n.supplierAt && Date.now() - n.supplierAt > 400 && n.supplierLevel) {
          n.supplierLevel = 0
          changed = true
        }
        out[k] = n
      }
      return changed ? out : prev
    })
  }, [now])

  // The match → dial sequence when the request has no calls yet.
  const runMatch = useCallback(async () => {
    if (!requestId || dialing.current) return
    dialing.current = true
    setError('')
    try {
      for (let i = 0; i < MATCH_STEPS.length; i++) {
        setStepIdx(i)
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 900))
      }
      const res = await api.matchRequest(requestId)
      setMatches(res.matches || [])
      setScanned(res.scanned ?? null)
      setStepIdx(MATCH_STEPS.length)
      await new Promise((r) => setTimeout(r, 3500))
      const { calls: created } = await api.startCalls(requestId)
      setCalls(created || [])
      refresh()
    } catch (err) {
      setError(`Couldn't run the match: ${err.message}`)
      dialing.current = false
    }
  }, [requestId, refresh])

  // Only the page that pressed "5 days have passed" runs the match + dials.
  // Every other screen (the admin monitor) just watches.
  const autoStarted = useRef(false)
  useEffect(() => {
    if (!autoRun || autoStarted.current) return
    if (requestId && request && calls.length === 0 && request.status === 'NEW') {
      autoStarted.current = true
      runMatch()
    }
  }, [autoRun, requestId, request, calls.length, runMatch])

  // Watching a match that another laptop started: animate the steps locally.
  useEffect(() => {
    if (dialing.current || request?.status !== 'MATCHING' || stepIdx >= MATCH_STEPS.length) return undefined
    const t = setTimeout(() => setStepIdx((i) => Math.min(MATCH_STEPS.length, i + 1)), 900)
    return () => clearTimeout(t)
  }, [request?.status, stepIdx])

  const rows = useMemo(() => specialtyRows(request), [request])
  const yes = calls.filter((c) => c.outcome === 'YES')
  const declined = calls.filter((c) => c.outcome === 'NO')
  const liveCount = calls.filter((c) => c.status === 'CONNECTED').length
  const allDone = calls.length > 0 && calls.every((c) => c.status === 'ENDED' || c.status === 'MISSED')
  const languages = new Set(calls.map((c) => c.language || live[c.id]?.lang).filter(Boolean))
  if (!languages.size && calls.length) languages.add('en')
  const winner = yes[0]
  const aekoLevel = Math.max(0, ...Object.values(live).map((v) => v.aekoLevel || 0))
  const phase = calls.length ? 'calls' : 'match'

  return (
    <section className="cr">
      <div className="cr__grid-bg" aria-hidden="true" />
      <header className="cr__top">
        <span className="cr__ship">
          <i /> SHIP WINDOW <b>{shipWindow}</b>
        </span>
        <span className="cr__disclaimer">Voice agent in pilot · live calls · demo suppliers</span>
        {user?.role === 'ADMIN' && (
          <button
            type="button"
            className="cr__reset"
            onClick={async () => {
              await api.resetDemo().catch(() => {})
              navigate('/control')
              window.location.reload()
            }}
          >
            Reset demo
          </button>
        )}
      </header>

      {!requestId && (
        <div className="cr__empty">
          <h1>Waiting for a brief…</h1>
          <p>Start a search on the brand laptop, then press “5 days have passed”.</p>
        </div>
      )}

      {requestId && (
        <div className="cr__layout">
          <aside className={`cr-aeko ${aekoLevel > 0.05 ? 'is-speaking' : ''}`}>
            <header className="cr-aeko__head">
              <span className="cr-aeko__orb">Æ</span>
              <div>
                <strong>Aeko</strong>
                <span>Aekovera sourcing agent</span>
              </div>
              <span className="cr-status cr-status--brand">
                <i />
                {phase === 'match' ? 'MATCHING' : liveCount ? `ON ${liveCount} CALL${liveCount > 1 ? 'S' : ''}` : allDone ? 'DONE' : 'DIALING'}
              </span>
            </header>
            <Waveform level={aekoLevel} tone="brand" bars={40} />
            <div className="cr-aeko__sec">
              <p className="cr-label">
                Order brief <span>{request?.brandCompany || ''}</span>
              </p>
              {rows.map(([k, v]) => (
                <div key={k} className={`cr-row ${winner ? 'is-ok' : ''}`}>
                  <span>{k}</span>
                  <strong>
                    {v} {winner && <em>✓</em>}
                  </strong>
                </div>
              ))}
            </div>
            {calls.length > 0 && (
              <div className="cr-aeko__sec">
                <p className="cr-label">
                  Calls{' '}
                  <span>
                    {declined.length} declined · {yes.length ? `${yes.length} match` : `${liveCount} live`}
                  </span>
                </p>
                <div className="cr-dots">
                  {calls.map((c) => (
                    <span key={c.id} className={`cr-dot cr-dot--${c.outcome ? c.outcome.toLowerCase() : c.status.toLowerCase()}`}>
                      {initials(c.supplier?.name)}
                    </span>
                  ))}
                </div>
                {declined.length > 0 && <p className="cr-saved">{declined.length} NOs saved to network</p>}
              </div>
            )}
            <div className="cr-aeko__sec">
              <p className="cr-label">Next steps</p>
              {!winner && <p className="cr-step">◌ {phase === 'match' ? 'Matching the network' : 'Waiting for a match'}</p>}
              {winner && (
                <>
                  <p className="cr-step is-ok">✓ Spec sheet sent · {request?.product || 'spec'}-spec-sheet.pdf</p>
                  <p className="cr-step is-ok">
                    ✓ Intro booked · {winner.introSlot || 'Tue 10:00'} · {winner.supplier?.name}
                  </p>
                </>
              )}
            </div>
          </aside>

          <main className="cr__stage">
            {phase === 'match' && request?.status === 'NEW' && !dialing.current && (
              <div className="cr-match">
                <h2 className="cr-ready">New brief from {request?.brandCompany || 'the brand'}: <b>{request?.rawQuery}</b></h2>
                <button type="button" className="btn btn--brand btn--lg" onClick={runMatch}>
                  ⏩ 5 days have passed — run Aeko
                </button>
              </div>
            )}

            {phase === 'match' && !(request?.status === 'NEW' && !dialing.current) && (
              <div className="cr-match">
                <ul className="cr-steps">
                  {MATCH_STEPS.map((s, i) => (
                    <li key={s} className={i < stepIdx ? 'is-done' : i === stepIdx ? 'is-active' : ''}>
                      <i>{i < stepIdx ? '✓' : ''}</i> {s}
                    </li>
                  ))}
                </ul>
                {matches.length > 0 && (
                  <div className="cr-results">
                    <h2>
                      <b>{matches.length}</b> makers found{scanned ? <> across <b>{scanned.toLocaleString()}</b> suppliers</> : null}
                    </h2>
                    {request?.searchTerms?.length > 0 && (
                      <div className="cr-terms">
                        <span>✱ UNDERSTOOD</span>
                        {request.searchTerms.map((t) => (
                          <em key={t}>{t}</em>
                        ))}
                      </div>
                    )}
                    <ol className="cr-matchlist">
                      {matches.slice(0, 6).map((m, i) => (
                        <li key={m.supplier?.id || i} className={i < 3 ? 'is-top' : ''}>
                          <span className="cr-ava">{initials(m.supplier?.name)}</span>
                          <strong>{m.supplier?.name}</strong>
                          <span>{m.supplier?.location}</span>
                          <span className="cr-score">{m.score}</span>
                          {i < 3 && <em>Calling</em>}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
                {error && (
                  <p className="live-error">
                    {error}{' '}
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={() => {
                        dialing.current = false
                        runMatch()
                      }}
                    >
                      Retry
                    </button>
                  </p>
                )}
              </div>
            )}

            {phase === 'calls' && !allDone && (
              <div className={`cr-tiles cr-tiles--${Math.min(calls.length, 4)}`}>
                {calls.map((c) => (
                  <CallTile key={c.id} call={c} live={live[c.id]} now={now} />
                ))}
              </div>
            )}

            {phase === 'calls' && allDone && (
              <div className="cr-final">
                <div className="cr-stats">
                  <div>
                    <b>{calls.length}</b>
                    <span>Calls at once</span>
                  </div>
                  <div>
                    <b>{languages.size}</b>
                    <span>{[...languages].map((l) => LANG_LABEL[l] || l).join(' · ')}</span>
                  </div>
                  <div>
                    <b className="is-brand">{yes.length}</b>
                    <span>Factory that can actually run it</span>
                  </div>
                </div>
                {winner ? (
                  <div className="cr-intro">
                    <div className="cr-intro__bar">
                      <span>Intro delivered by Aeko</span>
                      <span className="is-ok">Intro booked · {winner.introSlot || 'Tue 10:00'}</span>
                    </div>
                    <div className="cr-intro__nodes">
                      <div>
                        <span className="cr-ava cr-ava--lg">{initials(request?.brandCompany || 'Brand')}</span>
                        <strong>{request?.brandCompany || 'Your brand'}</strong>
                        <em>{request?.volume ? `${Number(request.volume).toLocaleString()} ` : ''}{request?.product}</em>
                      </div>
                      <span className="cr-intro__link">✕</span>
                      <div>
                        <span className="cr-ava cr-ava--lg cr-ava--dark">{initials(winner.supplier?.name)}</span>
                        <strong>{winner.supplier?.name}</strong>
                        <em className="is-ok">✓ {winner.outcomeReason}</em>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="cr-dim">No yes this round — every NO is saved to the network.</p>
                )}
                <div className="cr-tiles cr-tiles--mini">
                  {calls.map((c) => (
                    <CallTile key={c.id} call={c} live={live[c.id]} now={now} />
                  ))}
                </div>
              </div>
            )}
          </main>
        </div>
      )}
    </section>
  )
}
