import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import Monogram from '../Monogram.jsx'
import {
  ArrowRightIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
  FileTextIcon,
  GlobeIcon,
  MailIcon,
  MessageCircleIcon,
  RotateCcwIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from '../icons.jsx'
import { IntroAcceptCard } from '../PersonaCards.jsx'
import { BRAND_CONTEXT, fmtOffset } from '../../data/outreach.js'
import { groupChannelSteps } from './channels.js'

// ---------------------------------------------------------------------------
// Channel screens — each is a real product surface (messenger, mail client,
// call panel, browser frame, quote ledger, editorial finale) driven by the
// same timed steps the old scrolling feed rendered.
// ---------------------------------------------------------------------------

const WAVE_HEIGHTS = [38, 62, 80, 55, 92, 44, 70, 100, 58, 84, 40, 66, 88, 52, 74, 46, 90, 60, 36, 78, 54, 82, 48, 68, 42, 76]

const initials = (name) =>
  name
    .split(' ')
    .filter((w) => /^[A-Z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join('')

const firstName = (name) => name.split(' ')[0]

const clamp01 = (v) => Math.min(1, Math.max(0, v))

// "2m 14s" → 134 — for the live call timer.
function durationSeconds(dur) {
  const m = dur.match(/(\d+)\s*m/)
  const s = dur.match(/(\d+)\s*s/)
  return (m ? Number(m[1]) : 0) * 60 + (s ? Number(s[1]) : 0)
}

const fmtClock = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`

function LiveDot() {
  return <span className="ows-live-dot" aria-hidden="true" />
}

// Screen header: micro-label, display title, and the live mission counters.
export function ScreenHead({ ch, channels, list, counts }) {
  const idx = channels.findIndex((c) => c.id === ch.id)
  const queue =
    list.length === 1
      ? '1 supplier, selected from your results'
      : `${list.length} suppliers · partners first`
  return (
    <header className="ows-head">
      <div className="ows-head__id">
        <p className="ows-microlabel">
          <LiveDot /> Channel {String(idx + 1).padStart(2, '0')} / {String(channels.length).padStart(2, '0')} ·{' '}
          {ch.kind}
        </p>
        <h2 className="ows-head__title">{ch.title}</h2>
        <p className="ows-head__sub">
          {queue} — every step worked on {BRAND_CONTEXT.client}’s behalf.
        </p>
      </div>
      <dl className="ows-counts" aria-label="Live outreach progress">
        <div>
          <dt>Contacted</dt>
          <dd key={counts.contacted}>{counts.contacted}</dd>
        </div>
        <div>
          <dt>Replies</dt>
          <dd key={counts.replies}>{counts.replies}</dd>
        </div>
        <div>
          <dt>Quotes</dt>
          <dd key={counts.quotes}>{counts.quotes}</dd>
        </div>
        <div className="ows-counts__brand">
          <dt>Confirmed</dt>
          <dd key={counts.confirmed}>{counts.confirmed}</dd>
        </div>
      </dl>
    </header>
  )
}

// Per-supplier block wrapper — the chip rail plus the focused/live state.
function SupplierBlock({ block, focused = false, children }) {
  const s = block.supplier
  return (
    <section
      className={`ows-block ${focused ? 'ows-block--focus' : ''}`}
      data-focus={focused || undefined}
    >
      <header className="ows-block__chip">
        <Monogram name={s.name} small />
        <span className="ows-block__name">{s.name}</span>
        <span className="ows-block__meta">{s.match}% match</span>
        {focused ? (
          <span className="ows-block__live">
            <LiveDot /> Working
          </span>
        ) : null}
      </header>
      {children}
    </section>
  )
}

// ---------------------------------------------------------------------------
// CHAT — a messenger pane per supplier: header, live thread, typing indicator,
// decorative input bar.
// ---------------------------------------------------------------------------

function ChatBlock({ block, elapsed, focused = false }) {
  const s = block.supplier
  const review = block.steps.find((st) => st.kind === 'review')
  const msgs = block.steps.filter((st) => st.kind === 'chat-msg' || st.kind === 'chat-status')
  const visibleMsgs = msgs.filter((m) => m.start <= elapsed)
  const next = msgs.find((m) => m.start > elapsed)
  // Three-dot indicator while the next speaker "composes" (agent or supplier).
  const typing = next && next.kind === 'chat-msg' && next.start - elapsed <= 1.2
  const scrollRef = useRef(null)

  // Keep the thread pinned to its newest message, chat-client style.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [visibleMsgs.length])

  return (
    <div className={`cp ${focused ? 'cp--focus' : ''}`} data-focus={focused || undefined}>
      <header className="cp__head">
        <Monogram name={s.name} />
        <div className="cp__id">
          <p className="cp__name">{s.name}</p>
          <p className="cp__meta">
            {s.match}% match{s.partner ? ' · Aekovera Partner' : ''} · {s.response ?? 'Community supplier'}
          </p>
        </div>
        <span className="cp__badge">
          {s.partner ? (
            <>
              <ShieldCheckIcon size={11} /> Partner
            </>
          ) : (
            'Community'
          )}
        </span>
      </header>

      <div className="cp__scroll" ref={scrollRef}>
        <div className="chat chat--pane">
          {review && (
            <p className="cp__review">
              <EyeIcon size={11} /> Profile reviewed · {fmtOffset(review.start)}
            </p>
          )}
          {visibleMsgs.map((m) =>
            m.kind === 'chat-status' ? (
              <span key={m.id} className="chat__status">
                <ClockIcon size={11} /> {m.data.text}
              </span>
            ) : (
              <p key={m.id} className={`chat__msg chat__msg--${m.data.role}`}>
                {m.data.text}
              </p>
            ),
          )}
          {typing && (
            <p key="typing" className={`chat__msg chat__msg--${next.data.role} chat__msg--typing`}>
              <span className="chat__dots" aria-label="Typing">
                <i />
                <i />
                <i />
              </span>
            </p>
          )}
        </div>
      </div>

      <footer className="cp__input">
        <span className="cp__input-plus" aria-hidden="true">
          +
        </span>
        <input
          className="cp__input-field"
          type="text"
          disabled
          aria-hidden="true"
          tabIndex={-1}
          placeholder={`Message ${firstName(s.name)}…`}
        />
        <span className="cp__input-send" aria-hidden="true">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m22 2-7 20-4-9-9-4Z" />
            <path d="M22 2 11 13" />
          </svg>
        </span>
      </footer>
    </div>
  )
}

export function ChatScreen({ ch, list, elapsed, lastSi }) {
  const { blocks } = groupChannelSteps(ch, list)
  const approve = ch.steps.find((st) => st.kind === 'approve')
  return (
    <>
      {approve && (
        <div className="ows-approve">
          <span className="ows-approve__icon">
            <CheckCircleIcon size={14} />
          </span>
          <p>
            <strong>Outreach plan approved</strong> — {approve.data.count}{' '}
            {approve.data.count === 1 ? 'introduction' : 'introductions'} queued ·{' '}
            {approve.data.count === 1 ? 'targeted run' : 'Aekovera Partners first'}
          </p>
          <span className="ev__time">{fmtOffset(approve.start)}</span>
        </div>
      )}
      {blocks.map((block) => (
        <ChatBlock key={block.si} block={block} elapsed={elapsed} focused={block.si === lastSi} />
      ))}
    </>
  )
}

// ---------------------------------------------------------------------------
// EMAIL — a mail-client window per supplier; drafting skeleton, then the
// message with staggered paragraph reveal and a "Sent via Aekovera" stamp.
// ---------------------------------------------------------------------------

function MailBlock({ block, elapsed }) {
  const draft = block.steps.find((st) => st.kind === 'email-draft')
  const sentStep = block.steps.find((st) => st.kind === 'email-sent')
  const sent = Boolean(sentStep && sentStep.start <= elapsed)
  const data = draft.data
  return (
    <div className={`mail-client ${sent ? '' : 'mail-client--drafting'}`}>
      <div className="mail-client__chrome" aria-hidden="true">
        <span className="mail-client__dots">
          <i /> <i /> <i />
        </span>
        <span className="mail-client__title">Aekovera Mail — Compose</span>
      </div>
      {!sent ? (
        <div className="mail-client__body" role="presentation">
          <div className="mail-field-row">
            <span className="ows-microlabel">Subject</span>
            <span className="skel skel--w60" />
          </div>
          <div className="skel-stack">
            <span className="skel skel--w85" />
            <span className="skel skel--w85" />
            <span className="skel skel--w40" />
          </div>
          <p className="ows-microlabel ows-microlabel--soft">Drafting…</p>
        </div>
      ) : (
        <div className="mail-client__body">
          <p className="mail-client__subject">{data.subject}</p>
          <div className="mail-client__addr">
            <span>
              <span className="ows-microlabel">From</span> {data.from}
            </span>
            <span>
              <span className="ows-microlabel">To</span> {data.to}
            </span>
          </div>
          <div className="mail-client__text">
            {data.body.map((p, i) => (
              <p
                key={i}
                className={i === data.body.length - 1 ? 'mail__sign' : ''}
                style={{ animationDelay: `${i * 0.12}s` }}
              >
                {p}
              </p>
            ))}
          </div>
          <span className="mail__attach">
            <FileTextIcon size={12} /> {data.attachment}
          </span>
          <div className="mail-client__foot">
            <span className="mail__sent">
              <CheckCircleIcon size={12} /> Sent via Aekovera
            </span>
            <span className="ev__time">{fmtOffset(sentStep.start)}</span>
          </div>
          <span className="mail-client__stamp" aria-hidden="true">
            Sent
          </span>
        </div>
      )}
    </div>
  )
}

export function EmailScreen({ ch, list, elapsed, lastSi }) {
  const { blocks } = groupChannelSteps(ch, list)
  return (
    <>
      {blocks.map((block) => (
        <SupplierBlock key={block.si} block={block} focused={block.si === lastSi}>
          <MailBlock block={block} elapsed={elapsed} />
        </SupplierBlock>
      ))}
    </>
  )
}

// ---------------------------------------------------------------------------
// VOICE — call panel per supplier: ringing → in call, live timer, animated
// waveform, transcript captions line by line, end-of-call summary.
// ---------------------------------------------------------------------------

function CallBlock({ block, elapsed, focused = false }) {
  const s = block.supplier
  const step = block.steps.find((st) => st.kind === 'call')
  const { duration, tag, highlights } = step.data
  const started = elapsed >= step.start
  const p = clamp01((elapsed - step.start) / step.dur)
  const finished = elapsed >= step.start + step.dur
  const ringing = started && !finished && p < 0.25
  const total = durationSeconds(duration)
  const live = Math.round(clamp01(p) * total)

  return (
    <div className={`call-panel ${finished ? 'call-panel--done' : ''} ${started ? '' : 'call-panel--idle'}`} data-focus={focused || undefined}>
      <header className="call-panel__head">
        <span className={`call-panel__avatar ${started && !finished ? 'call-panel__avatar--live' : ''}`}>
          <Monogram name={s.name} small />
        </span>
        <div className="cp__id">
          <p className="cp__name">{s.name}</p>
          <p className="cp__meta">AI voice call · {tag}</p>
        </div>
        <span className={`call-panel__state ${ringing ? 'call-panel__state--ring' : ''}`}>
          {finished ? (
            <>
              <CheckCircleIcon size={11} /> Completed
            </>
          ) : !started ? (
            'Queued'
          ) : ringing ? (
            'Ringing…'
          ) : (
            <>
              <LiveDot /> In call
            </>
          )}
        </span>
      </header>

      <div className="call-panel__meter">
        <span className="wave" aria-hidden="true">
          {WAVE_HEIGHTS.map((h, i) => (
            <span
              key={i}
              className="wave__bar"
              style={{ height: `${h}%`, animationDelay: `${(i % 9) * 0.11}s` }}
            />
          ))}
        </span>
        <span className="call-panel__timer">{fmtClock(finished ? total : live)}</span>
      </div>

      <div className="call__t">
        {highlights.map((h, i) => {
          const shown = finished || p > (i + 1) / (highlights.length + 1)
          if (!shown) return null
          return (
            <p key={i} className="call__t-item">
              <span
                className={`call__t-who call__t-who--${h.who === 'Agent' ? 'agent' : 'supplier'}`}
              >
                {h.who}
              </span>
              {h.text}
            </p>
          )
        })}
      </div>

      {finished && (
        <p className="call-panel__summary">
          <CheckCircleIcon size={12} /> Call completed · {duration} · {tag}
        </p>
      )}
    </div>
  )
}

export function CallScreen({ ch, list, elapsed, lastSi }) {
  const { blocks } = groupChannelSteps(ch, list)
  return (
    <>
      {blocks.map((block) => (
        <SupplierBlock key={block.si} block={block} focused={block.si === lastSi}>
          <CallBlock block={block} elapsed={elapsed} focused={block.si === lastSi} />
        </SupplierBlock>
      ))}
    </>
  )
}

// ---------------------------------------------------------------------------
// FORMS — browser-frame card per supplier: URL bar, autofilling fields with
// highlight sweep, submit → success tick.
// ---------------------------------------------------------------------------

function FormBlock({ block, elapsed, focused = false }) {
  const fill = block.steps.find((st) => st.kind === 'form-fill')
  const submittedStep = block.steps.find((st) => st.kind === 'form-submitted')
  const submitted = Boolean(submittedStep && submittedStep.start <= elapsed)
  const filling = elapsed >= fill.start
  const { url, fields } = fill.data
  return (
    <div className={`browser ${submitted ? 'browser--sent' : ''}`} data-focus={focused || undefined}>
      <div className="browser__bar">
        <span className="browser__dots" aria-hidden="true">
          <i /> <i /> <i />
        </span>
        <span className="browser__url">
          <GlobeIcon size={11} /> {url}
        </span>
        {submitted && (
          <span className="browser__tick" aria-hidden="true">
            <CheckCircleIcon size={14} />
          </span>
        )}
      </div>
      <div className="browser__body">
        {/* Fields mount when the form-fill step fires — the CSS stagger IS the
            autofill sweep, so they must not render early. */}
        {filling ? (
          <>
            {fields.map((f, i) => (
              <div key={f.label} className="form__field">
                <span className="form__field-label">{f.label}</span>
                <span className={`form__val ${f.long ? 'form__val--long' : ''}`} style={{ '--i': i }}>
                  {f.value}
                </span>
              </div>
            ))}
            <span className={`form__btn ${submitted ? 'form__btn--sent' : ''}`}>
              {submitted ? (
                <>
                  <CheckCircleIcon size={13} /> Submitted
                </>
              ) : (
                'Send inquiry'
              )}
            </span>
          </>
        ) : (
          <p className="ows-microlabel ows-microlabel--soft">Queued…</p>
        )}
      </div>
    </div>
  )
}

export function FormsScreen({ ch, list, elapsed, lastSi }) {
  const { blocks } = groupChannelSteps(ch, list)
  return (
    <>
      {blocks.map((block) => (
        <SupplierBlock key={block.si} block={block} focused={block.si === lastSi}>
          <FormBlock block={block} elapsed={elapsed} focused={block.si === lastSi} />
        </SupplierBlock>
      ))}
    </>
  )
}

// ---------------------------------------------------------------------------
// QUOTES & FOLLOW-UPS — the outcome ledger: quote cards, team-call confirms,
// follow-up rows, graceful passes, and quiet client-question relay digests.
// ---------------------------------------------------------------------------

function RelayDigest({ step }) {
  const { question, answer } = step.data
  return (
    <div className="ows-relay">
      <span className="ows-microlabel">
        <MessageCircleIcon size={11} /> Client question relayed · {BRAND_CONTEXT.client}
      </span>
      <p className="relay__q">{question}</p>
      <p className="relay__a">{answer}</p>
      <span className="relay__note">
        <ClockIcon size={11} /> Answer relayed back to the supplier in-thread
      </span>
    </div>
  )
}

function QuotesBlock({ block, elapsed, relays }) {
  const quote = block.steps.find((st) => st.kind === 'quote' && st.start <= elapsed)
  const confirm = block.steps.find((st) => st.kind === 'confirm' && st.start <= elapsed)
  const followup = block.steps.find((st) => st.kind === 'followup' && st.start <= elapsed)
  const pass = block.steps.find((st) => st.kind === 'pass' && st.start <= elapsed)
  if (!quote && !confirm && !followup && !pass && relays.length === 0) return null
  return (
    <div className="ows-ledger">
      {relays.map((st) => (
        <RelayDigest key={st.id} step={st} />
      ))}
      {pass && (
        <div className="ows-quiet ows-quiet--pass">
          <span className="ev__label">
            <ShieldCheckIcon size={12} /> Graceful pass · kept warm
          </span>
          <span className="ows-quiet__meta">No spec sent — first call when a matching order lands</span>
        </div>
      )}
      {quote && (
        <div className="ows-quote">
          <div className="ows-quote__top">
            <span className="ows-microlabel">
              <MailIcon size={11} /> Quote received
            </span>
            <span className="badge-success">
              <CheckCircleIcon size={11} /> Within brand target
            </span>
          </div>
          <div className="quote-line">
            <span className="ows-quote__price">{quote.data.price}</span>
            <span className="ows-quote__unit">/ unit</span>
            <span className="ows-quote__terms">
              {quote.data.lead} · {quote.data.terms}
            </span>
          </div>
        </div>
      )}
      {confirm && (
        <div className="ows-confirm">
          <span className="ows-microlabel">
            <ShieldCheckIcon size={11} /> Aekovera team call
          </span>
          <div className="call__t">
            {confirm.data.highlights.map((h, i) => (
              <p key={i} className="call__t-item">
                <span
                  className={`call__t-who call__t-who--${h.who === 'Aekovera team' ? 'agent' : 'supplier'}`}
                >
                  {h.who}
                </span>
                {h.text}
              </p>
            ))}
          </div>
          <span className="badge-brand">
            <CheckCircleIcon size={11} /> Project confirmed
          </span>
        </div>
      )}
      {followup && (
        <div className="ows-quiet">
          <span className="ev__label">
            <ClockIcon size={12} /> Follow-up scheduled {followup.data.when}
          </span>
          <span className="ows-quiet__meta">{followup.data.text}</span>
        </div>
      )}
    </div>
  )
}

export function QuotesScreen({ ch, list, elapsed, lastSi }) {
  const { blocks, relays } = groupChannelSteps(ch, list)
  const relaysBySi = new Map()
  for (const r of relays) {
    if (r.si == null) continue
    if (!relaysBySi.has(r.si)) relaysBySi.set(r.si, [])
    relaysBySi.get(r.si).push(r)
  }
  // A supplier's ledger stays hidden until its first item fires — no bare chips.
  const settled = blocks.filter(
    (b) =>
      (relaysBySi.get(b.si) ?? []).some((st) => st.start <= elapsed) ||
      b.steps.some((st) => st.start <= elapsed),
  )
  return (
    <>
      {settled.map((block) => (
        <SupplierBlock key={block.si} block={block} focused={block.si === lastSi}>
          <QuotesBlock
            block={block}
            elapsed={elapsed}
            relays={relaysBySi.get(block.si) ?? []}
          />
        </SupplierBlock>
      ))}
    </>
  )
}

// ---------------------------------------------------------------------------
// INTRO (finale) — the editorial handoff: client and supplier as two identity
// panels joined by the agent, the Connected state, then the end-state summary.
// ---------------------------------------------------------------------------

function FinaleHero({ ch, elapsed }) {
  const steps = ch.steps
  const visible = steps.filter((st) => st.start <= elapsed)
  const current = visible[visible.length - 1]
  if (!current) return null
  const introCount = steps.filter((st) => st.kind === 'warm-intro').length
  const introIdx = visible.filter((st) => st.kind === 'warm-intro').length
  const connected = current.kind === 'warm-connected'
  const data = current.data

  return (
    <section className="finale" aria-live="polite">
      <p className="ows-microlabel ows-microlabel--center">
        <SparklesIcon size={12} /> Warm introduction{introCount > 1 ? ` · ${introIdx} of ${introCount}` : ''} ·
        delivered by {BRAND_CONTEXT.agent.name}
      </p>
      <h2 className="finale__title">
        {BRAND_CONTEXT.client} <em className="serif-accent">meets</em> {data.short}
      </h2>

      <div className={`finale__panels ${connected ? 'finale__panels--on' : ''}`}>
        <div className="finale__panel">
          <span className="finale__mono">OE</span>
          <p className="finale__name">{BRAND_CONTEXT.client}</p>
          <span className="finale__role">Client · fictional demo brand</span>
        </div>
        <div className="finale__bridge">
          <span className="finale__bridge-agent" aria-hidden="true">
            <SparklesIcon size={15} />
          </span>
          <span className="finale__bridge-label">{BRAND_CONTEXT.agent.name} · Aekovera</span>
          <span className="finale__bridge-line" aria-hidden="true" />
        </div>
        <div className="finale__panel">
          <span className="finale__mono">{initials(data.supplierName)}</span>
          <p className="finale__name">{data.supplierName}</p>
          <span className="finale__role">{connected ? 'Connected' : 'Receiving introduction…'}</span>
        </div>
      </div>

      {connected ? (
        <div className="finale__state">
          <div className="finale__pills">
            <span className="badge-brand">
              <CheckCircleIcon size={11} /> Intro delivered
            </span>
            <span className="badge-success">
              <CheckCircleIcon size={11} /> Thread opened
            </span>
          </div>
          <p className="finale__reply">“{data.reply}”</p>
        </div>
      ) : (
        <p className="finale__pending">
          <LiveDot /> Delivering the introduction…
        </p>
      )}
    </section>
  )
}

export function IntroScreen({ ch, list, elapsed, done, counts, outcomes, warm, onReplay }) {
  return (
    <div className="ows-finale">
      <FinaleHero ch={ch} elapsed={elapsed} done={done} />
      {done && <EndState outcomes={outcomes} counts={counts} warm={warm} onReplay={onReplay} />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// End state — the closing summary of the whole run (also the finale payoff).
// ---------------------------------------------------------------------------

export function EndState({ outcomes, counts, warm = [], onReplay }) {
  return (
    <section className="outreach-end">
      <div className="outreach-end__texture bg-grid" aria-hidden="true" />
      <div className="outreach-end__glow" aria-hidden="true" />
      <p className="eyebrow eyebrow--center eyebrow--brand">
        <span className="eyebrow__dash" /> Outreach round complete
      </p>
      <h2 className="outreach-end__title">
        Introductions that end in <em className="serif-accent">handshakes.</em>
      </h2>
      <p className="outreach-end__sub">
        Your agent didn’t just send emails — it worked the chat lines and phones, relayed the tricky
        questions to you, and handed the best fits a direct line to {BRAND_CONTEXT.client}.
      </p>

      {warm.length > 0 && (
        <div className="warm-intros">
          <p className="end-partners__label">
            <SparklesIcon size={13} /> Warm introductions delivered
          </p>
          {warm.map((w, i) => (
            <div key={i} className="warm-card">
              <p className="warm-card__msg">{w.message}</p>
              <p className="warm-card__reply">{w.reply}</p>
              <span className="warm-card__connected">
                <CheckCircleIcon size={12} /> {w.connected}
              </span>
              <IntroAcceptCard
                supplier={w.supplierName}
                headline="Intro connected on the line"
                lines={[w.connected]}
                stamp="Warm intro accepted"
              />
            </div>
          ))}
        </div>
      )}

      <div className="end-counts">
        <div className="end-count">
          <span className="end-count__num">{counts.contacted}</span>
          <span className="end-count__label">Contacted</span>
        </div>
        <div className="end-count">
          <span className="end-count__num">{counts.replies}</span>
          <span className="end-count__label">Replies</span>
        </div>
        <div className="end-count">
          <span className="end-count__num">{counts.quotes}</span>
          <span className="end-count__label">Quotes</span>
        </div>
        <div className="end-count end-count--brand">
          <span className="end-count__num">{counts.confirmed}</span>
          <span className="end-count__label">Confirmed</span>
        </div>
      </div>

      {outcomes.length > 0 && (
        <div className="end-partners">
          <p className="end-partners__label">Top partner responses</p>
          {outcomes.map((o) => (
            <div key={o.id} className="end-partner">
              <Monogram name={o.name} small />
              <span className="end-partner__name">{o.name}</span>
              <span className="end-partner__quote">
                {o.quote ? `${o.quote.price} / unit · ${o.quote.lead}` : 'Quote pending'}
              </span>
              {o.confirmed ? (
                <span className="badge-brand">
                  <CheckCircleIcon size={11} /> Project confirmed
                </span>
              ) : (
                <span className="badge-success">
                  <CheckCircleIcon size={11} /> Quote received
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="outreach-end__actions">
        <Link to="/marketplace" className="btn btn--brand btn--lg">
          Continue to packaging marketplace
          <ArrowRightIcon size={18} className="btn__arrow" />
        </Link>
        <button type="button" className="btn btn--ghost" onClick={onReplay}>
          <RotateCcwIcon size={15} /> Replay sequence
        </button>
      </div>
      <p className="end-note">Simulated demo · suppliers, quotes & conversations are fictional</p>
    </section>
  )
}

// ---------------------------------------------------------------------------
// The screen itself: header + scrollable body with follow-camera.
// ---------------------------------------------------------------------------

const SCREENS = {
  chat: ChatScreen,
  email: EmailScreen,
  call: CallScreen,
  forms: FormsScreen,
  quotes: QuotesScreen,
  intro: IntroScreen,
}

export function ChannelScreen({ ch, channels, list, elapsed, instant, following, lastSi, counts, outcomes, warm, done, onReplay }) {
  const Body = SCREENS[ch.id]
  const chSteps = ch.steps.filter((st) => st.start <= elapsed)
  const lastStep = chSteps[chSteps.length - 1]
  const bodyRef = useRef(null)

  // Follow-camera inside the screen: keep the working supplier in view.
  useEffect(() => {
    if (!following || instant || ch.id === 'intro') return
    bodyRef.current
      ?.querySelector('[data-focus="true"]')
      ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [lastStep?.id, following, instant, ch.id])

  return (
    <div className="ows-screen">
      <ScreenHead ch={ch} channels={channels} list={list} counts={counts} />
      <div className="ows-screen__body" ref={bodyRef}>
        <Body
          ch={ch}
          list={list}
          elapsed={elapsed}
          done={done}
          counts={counts}
          outcomes={outcomes}
          warm={warm}
          onReplay={onReplay}
        />
      </div>
      {ch.id !== 'intro' && (
        <p className="ows-screen__note" aria-hidden="true">
          {lastSi != null && list[lastSi] ? `Live · ${list[lastSi].name}` : `Live · ${ch.kind}`}
        </p>
      )}
    </div>
  )
}
