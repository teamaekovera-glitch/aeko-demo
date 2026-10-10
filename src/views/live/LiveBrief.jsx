// Brand-side result of a live search: the parsed project request as saved in
// the database, Aeko's "go do your chores, I'll get back to you" line, and the
// "Start outreach" button: Aeko matches + calls makers in the
// background (the admin watches the control room); when the admin approves,
// Aeko calls the brand back here with the options.
import { useEffect, useRef, useState } from 'react'
import { api, ensureBrandSession } from '../../lib/live/api.js'
import BrandCallback from './BrandCallback.jsx'
import { AekoMascot } from './shared.jsx'
import { playPcmClip } from '../../lib/live/audio.js'

const AEKO_LINE = "Got it. Go do your chores — I'll talk to the makers and get back to you."

// Aeko's voice (Umbriel via /api/tts); browser TTS only if Gemini TTS fails.
async function speak(text) {
  try {
    const { audio } = await api.tts(text)
    if (audio) {
      await playPcmClip(audio)
      return
    }
  } catch {
    /* fall through to browser voice */
  }
  try {
    const synth = window.speechSynthesis
    if (!synth) return
    const u = new SpeechSynthesisUtterance(text)
    const v = synth.getVoices().find((x) => /^en/i.test(x.lang) && /female|samantha|aria|jenny|zira|google us english/i.test(x.name))
    if (v) u.voice = v
    u.rate = 1.04
    synth.cancel()
    synth.speak(u)
  } catch {
    /* optional */
  }
}

function Field({ k, v }) {
  if (v == null || v === '' || (Array.isArray(v) && !v.length)) return null
  return (
    <div>
      <dt>{k}</dt>
      <dd>{Array.isArray(v) ? v.join(', ') : String(v)}</dd>
    </div>
  )
}

export default function LiveBrief({ query, created, onReset }) {
  const [request, setRequest] = useState(created || null)
  const [stage, setStage] = useState('brief') // brief | working | callback
  const [callback, setCallback] = useState(null) // { request, systemInstruction }
  const [workNote, setWorkNote] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(!created)
  const spoke = useRef(false)

  useEffect(() => {
    if (created || !query) return
    let cancelled = false
    ;(async () => {
      try {
        setBusy(true)
        await ensureBrandSession()
        const { parsed } = await api.parseRequest(query)
        const { request: saved } = await api.createRequest({
          rawQuery: query,
          inputMode: 'text',
          language: parsed.language || 'en',
          category: parsed.category,
          product: parsed.product,
          volume: parsed.volume,
          moq: parsed.moq,
          specialty: parsed.specialty || {},
          searchTerms: parsed.searchTerms || [],
          deadline: parsed.deadline,
        })
        if (!cancelled) setRequest(saved)
      } catch (err) {
        if (!cancelled) setError(err.status === 401 ? 'Please sign in as the brand first.' : err.message)
      } finally {
        if (!cancelled) setBusy(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [query, created])

  useEffect(() => {
    if (request && !spoke.current && request.inputMode !== 'voice') {
      spoke.current = true
      speak(AEKO_LINE)
    }
  }, [request])

  const sp = request?.specialty || {}

  // "Start outreach": run the match, give the control room a beat to
  // animate, then dial the top makers. All in the background.
  const fastForward = async () => {
    if (!request) return
    setStage('working')
    setError('')
    try {
      setWorkNote('Rummaging through the network for makers who can actually run it…')
      if (request.status === 'NEW') {
        const res = await api.matchRequest(request.id)
        setWorkNote(`${res.matches?.length || 0} makers matched across ${res.scanned || 'the'} suppliers — dialing the best ones now. Phone's warm.`)
        await new Promise((r) => setTimeout(r, 6000))
        await api.startCalls(request.id)
      }
      setWorkNote("I'm on the phone with the makers. Go do your chores — I'll get back to you.")
    } catch (err) {
      setError(`Couldn't start Aeko: ${err.message}`)
      setStage('brief')
    }
  }

  // Wait for the admin's approval → Aeko's callback rings here.
  useEffect(() => {
    if (stage !== 'working' || !request) return undefined
    let stop = false
    const tick = async () => {
      try {
        const data = await api.callbackPending()
        if (!stop && data.request && data.request.id === request.id && data.request.callbackStatus === 'READY') {
          setCallback(data)
          setStage('callback')
          return
        }
      } catch {
        /* keep waiting */
      }
      if (!stop) setTimeout(tick, 2000)
    }
    tick()
    return () => {
      stop = true
    }
  }, [stage, request])

  // Demo reset fallback: if the request was wiped, go back to a clean start
  // (Realtime broadcast normally handles this instantly).
  useEffect(() => {
    if (!request?.id) return undefined
    const t = setInterval(async () => {
      try {
        await api.getRequest(request.id)
      } catch (err) {
        if (err.status === 404) window.location.replace('/')
      }
    }, 4000)
    return () => clearInterval(t)
  }, [request?.id])

  if (stage === 'callback' && callback) {
    return <BrandCallback request={callback.request} systemInstruction={callback.systemInstruction} onDone={onReset} />
  }

  return (
    <section className="results">
      <div className="results__inner lb">
        <p className="eyebrow">
          <span className="eyebrow__dash" /> Project request · saved
        </p>
        <h1 className="results__title">
          {busy ? 'Reading your brief…' : 'Aeko has your brief'}
          {request?.rawQuery && (
            <>
              {' '}
              <em className="serif-accent">“{request.rawQuery}”</em>
            </>
          )}
        </h1>

        {error && <p className="live-error">{error}</p>}

        {request && (
          <>
            {request.searchTerms?.length > 0 && (
              <div className="lb__terms">
                <span>✱ UNDERSTOOD</span>
                {request.searchTerms.map((t) => (
                  <em key={t}>{t}</em>
                ))}
              </div>
            )}
            <dl className="spec-preview lb__fields">
              <Field k="Category" v={request.category} />
              <Field k="Product" v={request.product} />
              <Field k="Volume" v={request.volume ? `${Number(request.volume).toLocaleString()} units` : null} />
              <Field k="MOQ" v={request.moq ? `${Number(request.moq).toLocaleString()} units` : null} />
              <Field k="Equipment" v={sp.equipment} />
              <Field k="Line / requirements" v={sp.line || sp.requirements || sp.capabilities} />
              <Field k="Packaging" v={sp.packaging} />
              <Field k="Deadline" v={request.deadline} />
              <Field k="Input" v={request.inputMode === 'voice' ? `Voice · ${request.language || 'en'}` : 'Text'} />
            </dl>

            <div className="lb__aeko">
              <AekoMascot size={64} listening={stage === 'working'} />
              <p>
                <strong>Aeko</strong> {stage === 'working' ? workNote : AEKO_LINE}
              </p>
              {stage === 'working' && <span className="lb__working" aria-hidden="true"><i /><i /><i /></span>}
            </div>

            <div className="lb__actions">
              <button type="button" className="btn btn--brand btn--lg" onClick={fastForward} disabled={stage !== 'brief'}>
                Start outreach
              </button>
              <button type="button" className="btn btn--ghost" onClick={onReset}>
                New brief
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
