// Voice search: the brand talks to Aeko (Gemini Live) in English, Hindi,
// Marathi or Norwegian; Aeko asks at most two follow-ups, then saves the
// project request through submit_project_request.
import { useEffect, useRef, useState } from 'react'
import { api } from '../../lib/live/api.js'
import { startLiveSession, BRAND_INTAKE_TOOLS, BRAND_INTAKE_INSTRUCTION } from '../../lib/live/session.js'
import { Waveform } from './shared.jsx'

export function requestFromIntake(args) {
  const equipment = Array.isArray(args.equipment) ? args.equipment : []
  const requirements = Array.isArray(args.requirements) ? args.requirements : []
  const searchTerms = [args.product, ...equipment, ...requirements].filter(Boolean)
  return {
    rawQuery: args.summary || args.product,
    inputMode: 'voice',
    language: args.language || 'en',
    category: args.category || null,
    product: args.product || null,
    volume: Number.isFinite(Number(args.volume)) ? Number(args.volume) : null,
    moq: Number.isFinite(Number(args.moq)) ? Number(args.moq) : null,
    specialty: {
      equipment,
      requirements,
      line: requirements.join(', ') || null,
      packaging: args.packaging || null,
    },
    searchTerms,
    deadline: args.deadline || null,
  }
}

export default function VoiceIntake({ onCreated, onClose }) {
  const [state, setState] = useState('connecting')
  const [lines, setLines] = useState([])
  const [aekoLevel, setAekoLevel] = useState(0)
  const [userLevel, setUserLevel] = useState(0)
  const [error, setError] = useState('')
  const sessionRef = useRef(null)
  const createdRef = useRef(null)
  const closingRef = useRef(false)

  const close = async (drain) => {
    if (closingRef.current) return
    closingRef.current = true
    const s = sessionRef.current
    sessionRef.current = null
    if (s) {
      if (drain) await s.drain(7000)
      await s.stop()
    }
    if (createdRef.current) onCreated(createdRef.current)
    else onClose()
  }

  useEffect(() => {
    let cancelled = false
    startLiveSession({
      purpose: 'brand_intake',
      systemInstruction: BRAND_INTAKE_INSTRUCTION,
      tools: BRAND_INTAKE_TOOLS,
      kickoff: 'The founder just tapped the microphone. Greet them in one short line and ask what they want to make.',
      onState: (st, detail) => {
        if (cancelled) return
        if (st === 'error') setError(detail || 'Voice connection error')
        else if (st !== 'ended') setState(st)
      },
      onAekoLevel: setAekoLevel,
      onUserLevel: setUserLevel,
      onTranscript: ({ speaker, text, final }) => {
        setLines((prev) => {
          const next = [...prev]
          const last = next[next.length - 1]
          if (last && last.speaker === speaker && !last.final) next[next.length - 1] = { speaker, text, final }
          else next.push({ speaker, text, final })
          return next.slice(-8)
        })
      },
      onToolCall: async (name, args) => {
        if (name === 'submit_project_request') {
          const { request } = await api.createRequest(requestFromIntake(args))
          createdRef.current = request
          return { ok: true, requestId: request.id }
        }
        if (name === 'end_session') {
          setTimeout(() => close(true), 50)
          return { ok: true }
        }
        return { ok: false }
      },
    })
      .then((s) => {
        if (cancelled) s.stop()
        else sessionRef.current = s
      })
      .catch((err) => setError(err?.message || 'Could not start voice'))
    return () => {
      cancelled = true
      sessionRef.current?.stop()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="spec-modal" role="dialog" aria-modal="true" aria-label="Talk to Aeko">
      <div className="spec-modal__backdrop" onClick={() => close(false)} />
      <div className="spec-modal__card vi">
        <div className="spec-modal__head">
          <h3>Talk to Aeko</h3>
          <button type="button" className="spec-modal__close" aria-label="Close" onClick={() => close(false)}>
            ×
          </button>
        </div>
        <p className="spec-modal__sub">English · हिन्दी · मराठी · Norsk — just speak naturally.</p>
        <div className={`vi__orb ${aekoLevel > 0.05 ? 'is-speaking' : ''} ${userLevel > 0.08 ? 'is-hearing' : ''}`}>Æ</div>
        <p className="vi__state">
          {error
            ? 'Voice unavailable'
            : state === 'connecting'
              ? 'Connecting to Aeko…'
              : aekoLevel > 0.05
                ? 'Aeko is speaking…'
                : 'Listening — go ahead'}
        </p>
        <Waveform level={Math.max(aekoLevel, userLevel)} tone="brand" />
        <div className="vi__lines">
          {lines.map((l, i) => (
            <p key={i} className={`vi__line vi__line--${l.speaker}${l.final ? '' : ' is-partial'}`}>
              <span>{l.speaker === 'aeko' ? 'Aeko' : 'You'}</span> {l.text}
            </p>
          ))}
        </div>
        {error && <p className="live-error">{error} — you can type your brief in the search bar instead.</p>}
      </div>
    </div>
  )
}
