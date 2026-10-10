import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SupplierCard from '../components/SupplierCard.jsx'
import LiveBrief from './live/LiveBrief.jsx'
import VoiceIntake from './live/VoiceIntake.jsx'
import {
  SparklesIcon,
  ArrowRightIcon,
  FileTextIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
} from '../components/icons.jsx'
import {
  partnerSuppliers,
  communitySuppliers,
  introShortlistFor,
  SAMPLE_SPEC,
  BRIEF_PLACEHOLDER,
  SUGGESTIONS,
} from '../data/suppliers.js'

const TOTAL_SUPPLIERS = partnerSuppliers.length + communitySuppliers.length
const MIN_INTROS = 10
const MAX_INTROS = 20
const COUNT_PRESETS = [10, 15, 20]

function BriefForm({ value, onChange, onSubmit, onMic, autoFocus = false, buttonLabel = 'Search' }) {
  return (
    <form
      className="brief-form"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
    >
      <div className="brief-bar">
        <SparklesIcon size={20} className="brief-bar__spark" />
        <input
          aria-label="Describe what you want to manufacture"
          placeholder={BRIEF_PLACEHOLDER}
          className="brief-bar__input"
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value)}
        />
        {onMic && (
          <button type="button" className="brief-bar__mic" onClick={onMic} aria-label="Search by voice" title="Search by voice — English, हिन्दी, मराठी, Norsk">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="9" y="2" width="6" height="12" rx="3" />
              <path d="M5 10a7 7 0 0 0 14 0" />
              <line x1="12" y1="17" x2="12" y2="22" />
            </svg>
          </button>
        )}
        <button type="submit" className="btn btn--navy btn--submit" disabled={!value.trim()}>
          <span className="btn__submit-label">{buttonLabel}</span>
          <ArrowRightIcon size={16} />
        </button>
      </div>
    </form>
  )
}

// Spec-sheet intake modal: attach a real file (file name only is used — nothing
// is parsed or uploaded) or one-click the realistic sample sheet.
function SpecSheetModal({ spec, onAttach, onClose }) {
  const [draft, setDraft] = useState(spec)
  const fileRef = useRef(null)

  return (
    <div className="spec-modal" role="dialog" aria-modal="true" aria-label="Add spec sheet">
      <div className="spec-modal__backdrop" onClick={onClose} />
      <div className="spec-modal__card">
        <div className="spec-modal__head">
          <h3>Add spec sheet</h3>
          <button type="button" className="spec-modal__close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <p className="spec-modal__sub">
          Attach your spec sheet or start from our sample — the agent reads it into the brief and
          shares it with the suppliers you approve.
        </p>

        <button type="button" className="spec-drop" onClick={() => fileRef.current?.click()}>
          <FileTextIcon size={20} />
          {draft ? (
            <span className="spec-drop__name">{draft.name}</span>
          ) : (
            <>
              <span className="spec-drop__title">Attach spec sheet — PDF, doc, or sheet</span>
              <span className="spec-drop__hint">
                Click to browse · this demo reads the file name only
              </span>
            </>
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) setDraft({ name: file.name, source: 'file', fields: null })
          }}
        />

        <button
          type="button"
          className="btn btn--ghost spec-modal__sample"
          onClick={() => setDraft({ ...SAMPLE_SPEC, fields: SAMPLE_SPEC.fields.map((f) => ({ ...f })) })}
        >
          <SparklesIcon size={14} /> Use sample spec sheet
        </button>

        {draft?.fields && (
          <dl className="spec-preview">
            {draft.fields.map((f) => (
              <div key={f.label}>
                <dt>{f.label}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>
        )}

        <div className="spec-modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn--brand"
            disabled={!draft}
            onClick={() => draft && onAttach(draft)}
          >
            <CheckCircleIcon size={15} /> Attach spec sheet
          </button>
        </div>
      </div>
    </div>
  )
}

// Focused per-supplier introduction modal — same spec-sheet intake patterns as
// the global flow, scoped to one supplier. Aekovera drafts every message; the
// brand approves the plan before anything is sent.
function IntroduceModal({ supplier, spec, onClose, onConfirm }) {
  const [draft, setDraft] = useState(spec)
  const fileRef = useRef(null)

  return (
    <div
      className="spec-modal"
      role="dialog"
      aria-modal="true"
      aria-label={`Introduce us to ${supplier.name}`}
    >
      <div className="spec-modal__backdrop" onClick={onClose} />
      <div className="spec-modal__card">
        <div className="spec-modal__head">
          <h3>Introduce us to {supplier.name}</h3>
          <button type="button" className="spec-modal__close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <p className="spec-modal__sub">
          Aekovera drafts every message and you approve the plan before anything is sent —{' '}
          {supplier.name} sees your brief and spec sheet first.
        </p>

        <button type="button" className="spec-drop" onClick={() => fileRef.current?.click()}>
          <FileTextIcon size={20} />
          {draft ? (
            <span className="spec-drop__name">{draft.name}</span>
          ) : (
            <>
              <span className="spec-drop__title">Attach spec sheet — PDF, doc, or sheet</span>
              <span className="spec-drop__hint">
                Click to browse · this demo reads the file name only
              </span>
            </>
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) setDraft({ name: file.name, source: 'file', fields: null })
          }}
        />

        <div className="spec-modal__options">
          {draft && (
            <button type="button" className="btn btn--ghost" onClick={() => setDraft(null)}>
              Remove attachment
            </button>
          )}
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() =>
              setDraft({ ...SAMPLE_SPEC, fields: SAMPLE_SPEC.fields.map((f) => ({ ...f })) })
            }
          >
            <SparklesIcon size={14} /> Use sample spec sheet
          </button>
        </div>

        {draft?.fields && (
          <dl className="spec-preview">
            {draft.fields.map((f) => (
              <div key={f.label}>
                <dt>{f.label}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>
        )}

        <p className="spec-modal__note">
          <ShieldCheckIcon size={13} /> Aekovera drafts every message — you approve the plan before
          anything is sent.
        </p>

        <div className="spec-modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn--brand btn--pill" onClick={() => onConfirm(draft)}>
            Introduce us to {supplier.name}
            <ArrowRightIcon size={15} className="btn__arrow" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Discover() {
  const [brief, setBrief] = useState('')
  const [query, setQuery] = useState(null)
  const [count, setCount] = useState(MIN_INTROS)
  const [spec, setSpec] = useState(null)
  const [showSpec, setShowSpec] = useState(false)
  const [introTarget, setIntroTarget] = useState(null)
  const navigate = useNavigate()
  // Live mode: a signed-in brand gets the real pipeline (saved project
  // request → control room). Everyone else keeps the simulated demo.
  // No sign-in needed: live mode is on for everyone (guest brand session is
  // opened on the first search). Add ?sim=1 to get the old simulated demo.
  const live = !new URLSearchParams(window.location.search).has('sim')
  const [liveQuery, setLiveQuery] = useState(null)
  const [liveCreated, setLiveCreated] = useState(null)
  const [voiceOpen, setVoiceOpen] = useState(false)

  const search = () => {
    const q = brief.trim()
    if (!q) return
    if (live) {
      setLiveCreated(null)
      setLiveQuery(q)
      return
    }
    setQuery(q)
  }

  const openVoice = () => setVoiceOpen(true)

  const resetLive = () => {
    setLiveQuery(null)
    setLiveCreated(null)
    setBrief('')
  }

  if (liveQuery || liveCreated) {
    return <LiveBrief key={liveCreated?.id || liveQuery} query={liveQuery} created={liveCreated} onReset={resetLive} />
  }

  return (
    <>
      {!query ? (
        // ---------------- Landing / search state ----------------
        <section className="hero">
          <div className="hero__texture bg-grid mask-radial" aria-hidden="true" />
          <div className="hero__inner">
            <div className="hero__content">
              <p className="eyebrow eyebrow--center">
                <span className="eyebrow__dash" /> Aekovera · Sourcing copilot
              </p>
              <h1 className="hero__title">
                Describe it once.
                <br />
                <em className="serif-accent">Meet the makers.</em>
              </h1>
              <p className="hero__lead">
                Where CPG brands’ favorite suppliers live.
              </p>
              <p className="hero__sub">
                Brief the Aekovera copilot and instantly see the co-manufacturers, co-packers, and
                packaging partners behind real production wins — ranked, rated, and ready for your
                next run.
              </p>

              <div className="hero__form">
                <BriefForm value={brief} onChange={setBrief} onSubmit={search} onMic={openVoice} autoFocus />
                {voiceOpen && (
                  <VoiceIntake
                    onClose={() => setVoiceOpen(false)}
                    onCreated={(req) => {
                      setVoiceOpen(false)
                      setLiveQuery(null)
                      setLiveCreated(req)
                    }}
                  />
                )}
                <p className="hero__form-note">
                  Describe your product in detail and instantly discover who can manufacture it —
                  complete with intelligent match scores and direct supplier connections.
                </p>
                <div className="hero__chips" role="list" aria-label="Example briefs">
                  <span className="hero__chips-label">Try</span>
                  {SUGGESTIONS.map((s, i) => (
                    <button
                      key={s}
                      type="button"
                      className={`chip ${i === 0 ? 'chip--accent' : ''}`}
                      onClick={() => setBrief(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : (
        // ---------------- Results state ----------------
        <section className="results">
          <div className="results__inner">
            <div className="results__head">
              <div>
                <p className="eyebrow">
                  <span className="eyebrow__dash" /> Match results
                </p>
                <h1 className="results__title">
                  {TOTAL_SUPPLIERS} suppliers matched for <em className="serif-accent">“{query}”</em>
                </h1>
                <p className="results__rank-note">
                  Ranked by · <strong>Aekovera Partners first</strong>, then community rating
                </p>
              </div>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => {
                  setQuery(null)
                  setBrief('')
                }}
              >
                New brief
              </button>
            </div>

            <div className="results__search">
              <BriefForm value={brief} onChange={setBrief} onSubmit={search} buttonLabel="Re-search" />
            </div>

            <section className="results__section" aria-label="Aekovera Partner suppliers">
              <p className="eyebrow eyebrow--brand">
                <span className="eyebrow__dash" /> Aekovera Partner · Recommended
              </p>
              <div className="grid grid--partners">
                {partnerSuppliers.map((s) => (
                  <SupplierCard key={s.id} supplier={s} onIntroduce={() => setIntroTarget(s)} />
                ))}
              </div>
            </section>

            <section className="results__section" aria-label="All matching suppliers">
              <p className="eyebrow">
                <span className="eyebrow__dash" /> All matches · Ranked by rating
              </p>
              <div className="grid grid--community">
                {communitySuppliers.map((s) => (
                  <SupplierCard key={s.id} supplier={s} onIntroduce={() => setIntroTarget(s)} />
                ))}
              </div>
            </section>

            <section className="intro-cta" aria-label="Introductions">
              <div className="intro-cta__texture bg-grid" aria-hidden="true" />
              <div className="intro-cta__glow" aria-hidden="true" />
              <p className="eyebrow eyebrow--center">
                <span className="eyebrow__dash" /> Aekovera Agent
              </p>
              <h2 className="intro-cta__title">Introduce us</h2>
              <p className="intro-cta__sub">
                Choose how many suppliers we should introduce you to — partners first — and attach
                your spec sheet. We draft every message; you approve the plan before anything is
                sent.
              </p>

              <div className="count-picker" role="group" aria-label="How many suppliers to introduce">
                <span className="count-picker__label">Introduce us to</span>
                <div className="stepper">
                  <button
                    type="button"
                    className="stepper__btn"
                    aria-label="Fewer suppliers"
                    disabled={count <= MIN_INTROS}
                    onClick={() => setCount((c) => Math.max(MIN_INTROS, c - 1))}
                  >
                    −
                  </button>
                  <span className="stepper__num">{count}</span>
                  <button
                    type="button"
                    className="stepper__btn"
                    aria-label="More suppliers"
                    disabled={count >= MAX_INTROS}
                    onClick={() => setCount((c) => Math.min(MAX_INTROS, c + 1))}
                  >
                    +
                  </button>
                </div>
                <div className="count-picker__presets" role="group" aria-label="Preset counts">
                  {COUNT_PRESETS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`chip ${count === n ? 'chip--accent' : ''}`}
                      onClick={() => setCount(n)}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <span className="count-picker__note">suppliers · ranked, partners first</span>
              </div>

              <div className="spec-attach">
                {spec ? (
                  <span className="spec-chip">
                    <FileTextIcon size={13} /> {spec.name}
                    <button
                      type="button"
                      className="spec-chip__remove"
                      aria-label="Remove spec sheet"
                      onClick={() => setSpec(null)}
                    >
                      ×
                    </button>
                  </span>
                ) : (
                  <button type="button" className="btn btn--ghost" onClick={() => setShowSpec(true)}>
                    <FileTextIcon size={14} /> Add spec sheet
                  </button>
                )}
                <span className="spec-attach__note">Optional — attached to the brief exactly as-is</span>
              </div>

              <button
                type="button"
                className="btn btn--brand btn--lg"
                onClick={() =>
                  navigate('/outreach', {
                    state: {
                      brief: query,
                      spec,
                      intros: introShortlistFor(count).map((s) => s.name),
                    },
                  })
                }
              >
                Introduce us to {count} suppliers
                <ArrowRightIcon size={18} className="btn__arrow" />
              </button>
            </section>

            {showSpec && (
              <SpecSheetModal
                spec={spec}
                onAttach={(s) => {
                  setSpec(s)
                  setShowSpec(false)
                }}
                onClose={() => setShowSpec(false)}
              />
            )}

            {introTarget && (
              <IntroduceModal
                supplier={introTarget}
                spec={spec}
                onClose={() => setIntroTarget(null)}
                onConfirm={(draft) => {
                  setSpec(draft)
                  navigate('/outreach', {
                    state: { brief: query, spec: draft, intros: [introTarget.name] },
                  })
                }}
              />
            )}
          </div>
        </section>
      )}
    </>
  )
}
