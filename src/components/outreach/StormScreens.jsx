// Storm beats — the in-call montage's parallel-activity screens. Four tiles
// at once: chats typing and answering together, an email blast waiting and
// confirming, calls ringing on top of each other, and the form that goes in
// when nobody picks up. Pure presentation — every state derives from the
// playback clock against the step times, so skip, seek, and pace all stay
// exact. Simulated locally; nothing is ever sent.
import { MailIcon, MessageCircleIcon, PhoneIcon, ClipboardListIcon } from '../icons.jsx'

const pad2 = (n) => String(n).padStart(2, '0')

function StormHead({ icon: Icon, kicker, meta }) {
  return (
    <header className="sstorm__head">
      <p className="sstorm__kicker">
        <Icon size={12} /> {kicker}
      </p>
      {meta && <p className="sstorm__meta">{meta}</p>}
    </header>
  )
}

function TileHead({ supplier }) {
  return (
    <header className="sstorm__tile-head">
      <span className="sstorm__ava" aria-hidden="true">
        {supplier.name.charAt(0)}
      </span>
      <strong className="sstorm__name">{supplier.name}</strong>
      <span className={`sstorm__badge${supplier.partner ? '' : ' sstorm__badge--com'}`}>
        {supplier.partner ? 'Partner' : 'Community'}
      </span>
    </header>
  )
}

// Typing dots — pure CSS pulse, same markup for agent and supplier sides.
function Dots({ label }) {
  return (
    <span className="sstorm__dots" aria-label={label}>
      <i />
      <i />
      <i />
    </span>
  )
}

// Beat 1 — four chat threads typing the same brief's questions at once, each
// taking a live reply: two green yes-answers, two red no-answers.
function ChatStorm({ ch, list, elapsed }) {
  const qBy = new Map(ch.steps.filter((s) => s.kind === 'storm-chat-q').map((s) => [s.si, s]))
  const aBy = new Map(ch.steps.filter((s) => s.kind === 'storm-chat-a').map((s) => [s.si, s]))
  return (
    <section className="sstorm">
      <StormHead
        icon={MessageCircleIcon}
        kicker="Live chats · running in parallel"
        meta="Four threads at once — one brief, four answers"
      />
      <div className="sstorm__grid sstorm__grid--chat">
        {list.slice(0, 4).map((s, si) => {
          const q = qBy.get(si)
          const a = aBy.get(si)
          if (!q || !a) return null
          const typing = elapsed < q.start
          const asked = elapsed >= q.start
          const answered = elapsed >= a.start
          const replying = asked && !answered && elapsed >= a.start - 0.8
          return (
            <article
              key={s.id}
              className={[
                'sstorm__tile',
                answered ? (a.data.ok ? 'is-yes' : 'is-no') : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <TileHead supplier={s} />
              <div className="sstorm__thread">
                <div className={`sstorm__msg sstorm__msg--agent${asked ? ' is-in' : ''}`}>
                  {typing ? <Dots label="Aeko is typing" /> : <span>{q.data.q}</span>}
                </div>
                <div className={`sstorm__msg sstorm__msg--supplier${answered ? ' is-in' : ''}`}>
                  {answered ? (
                    <span>
                      <em className={`sstorm__mark${a.data.ok ? '' : ' sstorm__mark--no'}`} aria-hidden="true">
                        {a.data.ok ? '✓' : '✕'}
                      </em>
                      {a.data.reply}
                    </span>
                  ) : replying ? (
                    <Dots label="Supplier is typing" />
                  ) : (
                    <span className="sstorm__pending">···</span>
                  )}
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

// Beat 2 — four email tiles: the RFQ blast lands on all of them at once, the
// room waits (pulsing band), then three confirms come back in real time while
// the fourth stays quiet.
function EmailStorm({ ch, list, elapsed }) {
  const sendBy = new Map(ch.steps.filter((s) => s.kind === 'storm-email-send').map((s) => [s.si, s]))
  const replies = ch.steps.filter((s) => s.kind === 'storm-email-reply')
  const replyBy = new Map(replies.map((s) => [s.si, s]))
  const firstReplyAt = replies.length ? Math.min(...replies.map((s) => s.start)) : Infinity
  const lastReply = replies.length ? Math.max(...replies.map((s) => s.start + s.dur)) : 0
  const firstSendAt = sendBy.size ? Math.min(...sendBy.values().map((s) => s.start)) : 0

  return (
    <section className="sstorm">
      <StormHead
        icon={MailIcon}
        kicker="Emails · 100 sent at once"
        meta="One RFQ, every matching supplier — replies land in real time"
      />
      <div className={`sstorm__waitband${elapsed >= firstSendAt + 0.6 && elapsed <= lastReply + 0.3 ? ' is-on' : ''}`}>
        NOW WE WAIT — RESPONSES LAND IN REAL TIME
      </div>
      <div className="sstorm__grid">
        {list.slice(0, 4).map((s, si) => {
          const send = sendBy.get(si)
          const reply = replyBy.get(si)
          if (!send) return null
          const sent = elapsed >= send.start
          const confirmed = reply && elapsed >= reply.start
          const quiet = sent && !reply && elapsed >= firstReplyAt
          return (
            <article
              key={s.id}
              className={[
                'sstorm__tile sstorm__tile--mail',
                confirmed ? 'is-yes' : quiet ? 'is-quiet' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <TileHead supplier={s} />
              <div className="sstorm__mail-state">
                {confirmed ? (
                  <span className="sstorm__status sstorm__status--ok">
                    ✓ CONFIRMED · {reply.data.mins} MIN
                  </span>
                ) : quiet ? (
                  <span className="sstorm__status sstorm__status--quiet">— still quiet</span>
                ) : sent ? (
                  <>
                    <span className="sstorm__status">✉ SENT · {send.data.subject}</span>
                    <span className="sstorm__awaiting">··· awaiting reply</span>
                  </>
                ) : (
                  <span className="sstorm__status sstorm__status--dim">Composing…</span>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

// Beat 3 — four call cards ringing at the same time, staggered so they read
// as simultaneous, resolving out of order: two quick passes, one maybe, and
// the Heartland card booking the tunnel-oven slot.
function CallStorm({ ch, list, elapsed }) {
  const callBy = new Map(ch.steps.filter((s) => s.kind === 'storm-call').map((s) => [s.si, s]))
  return (
    <section className="sstorm">
      <StormHead
        icon={PhoneIcon}
        kicker="Calls · ringing in parallel"
        meta="Every worthwhile line rings at once — the agent holds all four"
      />
      <div className="sstorm__grid">
        {list.slice(0, 4).map((s, si) => {
          const c = callBy.get(si)
          if (!c) return null
          const resolved = elapsed >= c.start
          return (
            <article
              key={s.id}
              className={`sstorm__callcard is-${c.data.result}${resolved ? ' is-resolved' : ''}`}
              style={{ '--enter': `${si * 0.22}s` }}
            >
              <TileHead supplier={s} />
              {resolved ? (
                <div className="sstorm__call-out">
                  <span className={`sstorm__call-glyph sstorm__call-glyph--${c.data.result}`} aria-hidden="true">
                    {c.data.result === 'yes' ? '✓' : c.data.result === 'maybe' ? '!' : '✕'}
                  </span>
                  <div>
                    <p className="sstorm__call-line">{c.data.line}</p>
                    {c.data.tag && <span className="sstorm__call-tag">{c.data.tag}</span>}
                  </div>
                </div>
              ) : (
                <div className="sstorm__call-out sstorm__call-out--ringing">
                  <span className="sstorm__call-glyph" aria-hidden="true">
                    <PhoneIcon size={15} />
                  </span>
                  <p className="sstorm__call-line">Ringing…</p>
                </div>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}

// Beat 4 — the no-answer fallback: rings go unanswered, so the contact forms
// fill themselves field by field and flip to submitted.
function FormsStorm({ ch, list, elapsed }) {
  const open = ch.steps.find((s) => s.kind === 'storm-form-open')
  const formBy = new Map(ch.steps.filter((s) => s.kind === 'storm-form').map((s) => [s.si, s]))
  const rings = open?.data?.rings ?? []
  const local = Math.max(0, elapsed - ch.start)
  const RING_AT = [0.3, 1.0, 1.7]
  const FILL_T0 = 2.7
  const FIELD_STEP = 0.55

  return (
    <section className="sstorm">
      <StormHead
        icon={ClipboardListIcon}
        kicker="No answer · the form goes instead"
        meta="Rings missed — the brief files itself and submits"
      />
      <div className="sstorm__rings" aria-hidden="true">
        {rings.map((r, i) => (
          <span key={r} className={`sstorm__ring${local >= RING_AT[i] ? ' is-in' : ''}`}>
            ☎ {r}
          </span>
        ))}
      </div>
      <div className="sstorm__grid">
        {list.slice(0, 4).map((s, si) => {
          const f = formBy.get(si)
          if (!f) return null
          const submitted = elapsed >= f.start
          return (
            <article key={s.id} className={`sstorm__formtile${submitted ? ' is-sent' : ''}`}>
              <TileHead supplier={s} />
              <div className="sstorm__fields">
                {f.data.fields.map((field, k) => {
                  const filled = submitted || local >= FILL_T0 + si * 0.18 + k * FIELD_STEP
                  return (
                    <div key={field.label} className={`sstorm__field${filled ? ' is-filled' : ''}`}>
                      <span>{field.label}</span>
                      <strong>{filled ? field.value : '▍'}</strong>
                    </div>
                  )
                })}
              </div>
              <span className={`sstorm__sentmark${submitted ? ' is-in' : ''}`}>SUBMITTED ✓</span>
            </article>
          )
        })}
      </div>
    </section>
  )
}

const STORM_SCREENS = {
  chat: ChatStorm,
  email: EmailStorm,
  call: CallStorm,
  forms: FormsStorm,
}

// The montage's storm screens — picked by channel id; quotes and warm-intro
// channels keep the workspace's own screens.
export default function StormScreen({ ch, list, elapsed }) {
  const Screen = STORM_SCREENS[ch.id]
  return Screen ? <Screen ch={ch} list={list} elapsed={elapsed} /> : null
}
