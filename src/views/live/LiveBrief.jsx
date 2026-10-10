// Brand-side result of a live search: the parsed project request as saved in
// the database, Aeko's "give me a couple of days" line, and the demo's
// "5 days have passed" fast-forward into the control room.
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/live/api.js'
import { playPcmClip } from '../../lib/live/audio.js'

const AEKO_LINE = "Got it. Give me a couple of days — I'll talk to the makers and call you back with the ones who can actually run it."

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
  const navigate = useNavigate()
  const [request, setRequest] = useState(created || null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(!created)
  const spoke = useRef(false)

  useEffect(() => {
    if (created || !query) return
    let cancelled = false
    ;(async () => {
      try {
        setBusy(true)
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
              <span className="lb__orb">Æ</span>
              <p>
                <strong>Aeko</strong> {AEKO_LINE}
              </p>
            </div>

            <div className="lb__actions">
              <button type="button" className="btn btn--brand btn--lg" onClick={() => navigate(`/control/${request.id}`)}>
                ⏩ 5 days have passed
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
