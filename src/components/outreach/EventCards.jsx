import { Link } from 'react-router-dom'
import Monogram from '../Monogram.jsx'
import {
  ArrowRightIcon,
  CheckCircleIcon,
  ClipboardListIcon,
  ClockIcon,
  EyeIcon,
  FileTextIcon,
  GlobeIcon,
  MailIcon,
  MessageCircleIcon,
  PhoneIcon,
  RotateCcwIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from '../icons.jsx'
import { BRAND_CONTEXT, fmtOffset } from '../../data/outreach.js'
import { IntroAcceptCard } from '../PersonaCards.jsx'

function EvTop({ icon, label, time, badge = null }) {
  return (
    <div className="ev__top">
      <span className="ev__label">
        {icon}
        {label}
      </span>
      <span className="ev__top-right">
        {badge}
        <span className="ev__time">{time}</span>
      </span>
    </div>
  )
}

export function ApproveCard({ step, innerRef }) {
  return (
    <div className="ev ev--approve" ref={innerRef}>
      <span className="ev__approve-icon">
        <CheckCircleIcon size={16} />
      </span>
      <div>
        <p className="ev__approve-title">Outreach plan approved</p>
        <p className="ev__approve-sub">
          {step.data.count} {step.data.count === 1 ? 'introduction' : 'introductions'} queued ·{' '}
          {step.data.count === 1 ? 'Targeted run' : 'Aekovera Partners first'}
        </p>
      </div>
      <span className="ev__time">{fmtOffset(step.start)}</span>
    </div>
  )
}

function ReviewRow({ step, supplier, innerRef }) {
  return (
    <div className="ev ev--plain" ref={innerRef}>
      <span className="ev__label">
        <EyeIcon size={13} /> Profile reviewed
      </span>
      <span className="ev__plain-meta">
        {supplier.match}% match · {supplier.partner ? 'Aekovera Partner' : 'Community supplier'}
      </span>
      <span className="ev__time">{fmtOffset(step.start)}</span>
    </div>
  )
}

function ChatCard({ msgs, lastRef }) {
  return (
    <div className="ev">
      <EvTop icon={<MessageCircleIcon size={13} />} label="Outreach chat" time={fmtOffset(msgs[0].start)} />
      <div className="chat">
        {msgs.map((m, i) =>
          m.kind === 'chat-status' ? (
            <span key={m.id} className="chat__status">
              <ClockIcon size={11} /> {m.data.text}
            </span>
          ) : (
            <p
              key={m.id}
              className={`chat__msg chat__msg--${m.data.role}`}
              ref={i === msgs.length - 1 ? lastRef : undefined}
            >
              {m.data.text}
            </p>
          ),
        )}
      </div>
    </div>
  )
}

// The relay middle step: the agent pauses the supplier thread to ask the
// client, then comes back with the answer. This three-way dynamic is the story.
function ClientCheckCard({ step, innerRef }) {
  const { question, answer } = step.data
  return (
    <div className="ev ev--relay" ref={innerRef}>
      <EvTop
        icon={<MessageCircleIcon size={13} />}
        label={`Checking with the client · ${BRAND_CONTEXT.client}`}
        time={fmtOffset(step.start)}
      />
      <div className="relay">
        <p className="relay__q">{question}</p>
        <p className="relay__a">{answer}</p>
        <span className="relay__note">
          <ClockIcon size={11} /> Answer relayed back to the supplier in-thread
        </span>
      </div>
    </div>
  )
}

function PassRow({ step, innerRef }) {
  return (
    <div className="ev ev--plain ev--pass" ref={innerRef}>
      <span className="ev__label">
        <ShieldCheckIcon size={13} /> Graceful pass · kept warm
      </span>
      <span className="ev__plain-meta">No spec sent — first call when a matching order lands</span>
      <span className="ev__time">{fmtOffset(step.start)}</span>
    </div>
  )
}

export function WarmIntroCard({ step, connected, compact = false, innerRef }) {
  const { message, reply, connected: connectedLine } = step.data
  return (
    <div className={`ev ev--warm ${connected ? 'ev--warm-connected' : ''}`} ref={innerRef}>
      <EvTop
        icon={<SparklesIcon size={13} />}
        label={connected ? 'Warm introduction · live thread' : 'Warm introduction'}
        time={fmtOffset(step.start)}
        badge={
          connected ? (
            <span className="badge-success">
              <CheckCircleIcon size={11} /> Intro delivered
            </span>
          ) : null
        }
      />
      {!compact && <p className="warm__msg">{message}</p>}
      {connected && (
        <>
          <p className="chat__msg chat__msg--supplier warm__reply">{reply}</p>
          <span className="warm__connected">
            <CheckCircleIcon size={12} /> {connectedLine}
          </span>
        </>
      )}
    </div>
  )
}

function EmailCard({ step, sent, innerRef }) {
  const { subject, body, attachment } = step.data
  return (
    <div className="ev" ref={innerRef}>
      <EvTop
        icon={<MailIcon size={13} />}
        label={sent ? 'Email · sent' : 'Email · drafting'}
        time={fmtOffset(step.start)}
      />
      {!sent ? (
        <div className="mail mail--drafting" role="presentation">
          <span className="skel skel--w40" />
          <span className="skel skel--w85" />
          <span className="skel skel--w85" />
          <span className="skel skel--w60" />
        </div>
      ) : (
        <div className="mail">
          <p className="mail__subject">{subject}</p>
          <div className="mail__body">
            {body.map((p, i) => (
              <p key={i} className={i === body.length - 1 ? 'mail__sign' : ''}>
                {p}
              </p>
            ))}
          </div>
          <span className="mail__attach">
            <FileTextIcon size={12} /> {attachment}
          </span>
          <div className="mail__foot">
            <span className="mail__sent">
              <CheckCircleIcon size={12} /> Sent via Aekovera
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

const WAVE_HEIGHTS = [38, 62, 80, 55, 92, 44, 70, 100, 58, 84, 40, 66, 88, 52, 74, 46, 90, 60, 36, 78, 54, 82, 48, 68, 42, 76]

function CallCard({ step, innerRef }) {
  const { duration, tag, highlights } = step.data
  return (
    <div className="ev" ref={innerRef}>
      <EvTop
        icon={<PhoneIcon size={13} />}
        label="AI voice call"
        time={fmtOffset(step.start)}
        badge={<span className="call__tag">{tag}</span>}
      />
      <div className="call">
        <div className="call__meta">
          <span className="wave" aria-hidden="true">
            {WAVE_HEIGHTS.map((h, i) => (
              <span
                key={i}
                className="wave__bar"
                style={{ height: `${h}%`, animationDelay: `${(i % 9) * 0.11}s` }}
              />
            ))}
          </span>
          <span className="call__dur">{duration}</span>
        </div>
        <div className="call__t">
          {highlights.map((h, i) => (
            <p key={i} className="call__t-item">
              <span
                className={`call__t-who call__t-who--${h.who === 'Agent' ? 'agent' : 'supplier'}`}
              >
                {h.who}
              </span>
              {h.text}
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}

function FormCard({ step, submitted, innerRef }) {
  const { url, fields } = step.data
  return (
    <div className="ev" ref={innerRef}>
      <EvTop
        icon={<ClipboardListIcon size={13} />}
        label={submitted ? 'Contact form · submitted' : 'Contact form · auto-fill'}
        time={fmtOffset(step.start)}
      />
      <div className="form">
        <span className="form__url">
          <GlobeIcon size={11} /> {url}
        </span>
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
      </div>
    </div>
  )
}

function QuoteCard({ step, innerRef }) {
  const { price, lead, terms } = step.data
  return (
    <div className="ev ev--quote" ref={innerRef}>
      <EvTop
        icon={<MailIcon size={13} />}
        label="Quote received"
        time={fmtOffset(step.start)}
        badge={
          <span className="badge-success">
            <CheckCircleIcon size={11} /> Within brand target
          </span>
        }
      />
      <div className="quote-line">
        <span className="quote-line__price">{price}</span>
        <span className="quote-line__unit">/ unit</span>
        <span className="quote__terms">
          {lead} · {terms}
        </span>
      </div>
    </div>
  )
}

function ConfirmCard({ step, innerRef }) {
  return (
    <div className="ev ev--confirm" ref={innerRef}>
      <EvTop
        icon={<ShieldCheckIcon size={13} />}
        label="Aekovera team call"
        time={fmtOffset(step.start)}
        badge={
          <span className="badge-brand">
            <CheckCircleIcon size={11} /> Project confirmed
          </span>
        }
      />
      <div className="call__t">
        {step.data.highlights.map((h, i) => (
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
    </div>
  )
}

function FollowupRow({ step, innerRef }) {
  return (
    <div className="ev ev--plain" ref={innerRef}>
      <span className="ev__label">
        <ClockIcon size={13} /> Follow-up scheduled {step.data.when}
      </span>
      <span className="ev__plain-meta">{step.data.text}</span>
      <span className="ev__time">{fmtOffset(step.start)}</span>
    </div>
  )
}

export function SupplierGroup({ supplier, evs, active, regRef }) {
  const reviewStep = evs.find((e) => e.kind === 'review')
  const emailStep = evs.find((e) => e.kind === 'email-draft')
  const emailSent = evs.some((e) => e.kind === 'email-sent')
  const callStep = evs.find((e) => e.kind === 'call')
  const formStep = evs.find((e) => e.kind === 'form-fill')
  const formSubmitted = evs.some((e) => e.kind === 'form-submitted')
  const quoteStep = evs.find((e) => e.kind === 'quote')
  const confirmStep = evs.find((e) => e.kind === 'confirm')
  const followupStep = evs.find((e) => e.kind === 'followup')

  // Chronological middle-of-group events: consecutive chat steps group into
  // one chat card, broken apart by client check-ins (the relay dynamic).
  const midBlocks = []
  let chatBuf = []
  const flushChat = () => {
    if (chatBuf.length > 0) {
      const msgs = chatBuf
      midBlocks.push(
        <ChatCard
          key={`chat-${msgs[0].id}`}
          msgs={msgs}
          lastRef={regRef(msgs[msgs.length - 1].id)}
        />,
      )
      chatBuf = []
    }
  }
  for (const e of evs) {
    if (e.kind === 'review' || e.kind === 'gap') continue
    if (e.kind === 'chat-msg' || e.kind === 'chat-status') {
      chatBuf.push(e)
      continue
    }
    flushChat()
    if (e.kind === 'client-check')
      midBlocks.push(<ClientCheckCard key={e.id} step={e} innerRef={regRef(e.id)} />)
    if (e.kind === 'pass') midBlocks.push(<PassRow key={e.id} step={e} innerRef={regRef(e.id)} />)
  }
  flushChat()

  const groupClass = [
    'ogroup',
    supplier.partner && 'ogroup--partner',
    active && 'ogroup--active',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <article className={groupClass}>
      <header className="ogroup__head">
        <Monogram name={supplier.name} />
        <div className="ogroup__id">
          <h3 className="ogroup__name">{supplier.name}</h3>
          <p className="ogroup__type">{supplier.location}</p>
        </div>
        {supplier.partner ? (
          <span className="badge-partner">
            <ShieldCheckIcon size={12} /> Aekovera Partner
          </span>
        ) : (
          <span className="badge-muted">Community match</span>
        )}
      </header>

      <div className="ogroup__events">
        {reviewStep && (
          <ReviewRow step={reviewStep} supplier={supplier} innerRef={regRef(reviewStep.id)} />
        )}
        {midBlocks}
        {emailStep && (
          <EmailCard step={emailStep} sent={emailSent} innerRef={regRef(emailStep.id)} />
        )}
        {callStep && <CallCard step={callStep} innerRef={regRef(callStep.id)} />}
        {formStep && (
          <FormCard step={formStep} submitted={formSubmitted} innerRef={regRef(formStep.id)} />
        )}
        {quoteStep && <QuoteCard step={quoteStep} innerRef={regRef(quoteStep.id)} />}
        {confirmStep && <ConfirmCard step={confirmStep} innerRef={regRef(confirmStep.id)} />}
        {followupStep && <FollowupRow step={followupStep} innerRef={regRef(followupStep.id)} />}
      </div>
    </article>
  )
}

export function EndState({ outcomes, counts, warm = [], onReplay, innerRef }) {
  return (
    <section className="outreach-end" ref={innerRef}>
      <div className="outreach-end__texture bg-grid" aria-hidden="true" />
      <div className="outreach-end__glow" aria-hidden="true" />
      <p className="eyebrow eyebrow--center eyebrow--brand">
        <span className="eyebrow__dash" /> Outreach round complete
      </p>
      <h2 className="outreach-end__title">
        Introductions that end in <em className="serif-accent">handshakes.</em>
      </h2>
      <p className="outreach-end__sub">
        Your agent didn’t just send emails — it worked the chat lines and phones, relaid the tricky
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
            </div>
          ))}
          <IntroAcceptCard
            supplier={warm[warm.length - 1]?.supplierName}
            headline="Warm introduction accepted"
            lines={[`Direct line now open between ${BRAND_CONTEXT.client} and the partner team`]}
            stamp="Connected just now"
          />
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
