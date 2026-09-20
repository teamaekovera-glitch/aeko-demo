// Simulated transaction flows: direct order, sample request, RFQ email.
// Purely client-side — nothing is sent anywhere; each flow ends in a
// visible confirmation state, Amazon-checkout style.

import { useEffect, useMemo, useState } from 'react'
import {
  XIcon,
  MinusIcon,
  PlusIcon,
  SendIcon,
  CartIcon,
} from './flow-icons.jsx'
import {
  CheckCircleIcon,
  ClockIcon,
  PackageIcon,
  MailIcon,
} from '../icons.jsx'
import { OpsApprovalCard } from '../PersonaCards.jsx'
import {
  applicableTier,
  nextTierAbove,
  tierSavingsPct,
  formatUsd,
  formatQty,
  rfqEmailFor,
  SAMPLE_SPEC_SHEET,
} from '../../data/packaging.js'

const FLOW_META = {
  order: { icon: CartIcon, title: 'Place order', sub: 'Direct checkout — a PO is sent to the supplier instantly.' },
  sample: { icon: PackageIcon, title: 'Request sample', sub: 'Try before you buy — 1 to 5 units, free for briefs on file.' },
  email: { icon: MailIcon, title: 'Email supplier', sub: 'An RFQ drafted from your on-file brand brief — edit anything before sending.' },
}

function Stepper({ value, onChange, min, max, id }) {
  const clamp = (n) => Math.max(min, Math.min(max, Number.isFinite(n) ? n : min))
  return (
    <span className="qty-stepper" role="group" aria-label="Quantity">
      <button type="button" aria-label="Decrease quantity" disabled={value <= min} onClick={() => onChange(clamp(value - 1))}>
        <MinusIcon size={14} />
      </button>
      <input
        id={id}
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(clamp(parseInt(e.target.value.replace(/\D/g, ''), 10)))}
        onBlur={() => onChange(clamp(value))}
        aria-label="Quantity"
      />
      <button type="button" aria-label="Increase quantity" disabled={value >= max} onClick={() => onChange(clamp(value + 1))}>
        <PlusIcon size={14} />
      </button>
    </span>
  )
}

function TierHint({ listing, qty }) {
  const tier = applicableTier(listing.tiers, qty)
  if (!tier) {
    return (
      <p className="qty-hint qty-hint--error" role="alert">
        Below MOQ — this supplier requires a minimum of {formatQty(listing.tiers[0].min)} units. Add {formatQty(listing.tiers[0].min - qty)} more to proceed.
      </p>
    )
  }
  const next = nextTierAbove(listing.tiers, qty)
  if (next) {
    const save = tierSavingsPct(listing.tiers, next)
    return (
      <p className="qty-hint qty-hint--tier">
        {formatQty(tier.min)}+ tier applied · add {formatQty(next.min - qty)} more units for the {formatQty(next.min)}+ tier at {formatUsd(next.price)}/unit (save {save}%)
      </p>
    )
  }
  return (
    <p className="qty-hint qty-hint--tier">
      Best rate unlocked — {formatQty(tier.min)}+ units at {formatUsd(tier.price)}/unit
    </p>
  )
}

function SummaryRows({ listing, qty, tier }) {
  const subtotal = qty * tier.price
  return (
    <dl className="order-summary">
      <div className="order-summary__row">
        <dt>Unit price ({formatQty(tier.min)}+ tier)</dt>
        <dd>{formatUsd(tier.price)}</dd>
      </div>
      <div className="order-summary__row">
        <dt>Quantity</dt>
        <dd>{formatQty(qty)} units</dd>
      </div>
      <div className="order-summary__row order-summary__row--total">
        <dt>Subtotal</dt>
        <dd>{formatUsd(subtotal)}</dd>
      </div>
      <div className="order-summary__row">
        <dt>Est. lead time</dt>
        <dd>{listing.leadTime}</dd>
      </div>
    </dl>
  )
}

function SuccessBox({ title, onDone, children }) {
  return (
    <div className="success-box">
      <span className="success-box__icon"><CheckCircleIcon size={26} /></span>
      <p className="success-box__title">{title}</p>
      {children}
      <button type="button" className="btn btn--navy btn--pill" onClick={onDone}>
        Done
      </button>
    </div>
  )
}

function OrderFlow({ listing, record, onClose }) {
  const [stage, setStage] = useState('configure')
  const [qty, setQty] = useState(listing.tiers[0].min)
  const tier = applicableTier(listing.tiers, qty)
  const po = useMemo(() => `AE-${4100 + Math.floor(Math.random() * 900)}`, [])
  const subtotal = tier ? qty * tier.price : 0

  if (stage === 'placed') {
    return (
      <SuccessBox title="Order placed — PO sent to supplier" onDone={onClose}>
        <p className="success-box__sub">
          {formatQty(qty)} units of “{listing.name}” at {formatUsd(tier.price)}/unit · {formatUsd(subtotal)} · est. {listing.leadTime}
        </p>
        <span className="success-box__po">PO #{po} · {listing.supplier}</span>
        <OpsApprovalCard
          supplier={listing.supplier}
          headline={`PO #${po} confirmed — production slot held`}
          lines={[`${formatQty(qty)} units · est. ${listing.leadTime}`]}
          stamp="PO confirmed by supplier ops"
        />
        <p className="success-box__foot">Aekovera tracks production against this PO and flags SLA risk automatically.</p>
      </SuccessBox>
    )
  }

  if (stage === 'confirm') {
    return (
      <div className="flow-confirm">
        <SummaryRows listing={listing} qty={qty} tier={tier} />
        <p className="order-terms"><CheckCircleIcon size={13} /> Free cancellation within 24h · PO #{po}</p>
        <div className="flow-actions">
          <button
            type="button"
            className="btn btn--brand btn--pill"
            onClick={() => {
              record(`PO #${po} placed · ${formatQty(qty)} units`)
              setStage('placed')
            }}
          >
            Place your order — {formatUsd(subtotal)}
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => setStage('configure')}>Back</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flow-row">
        <label className="flow-row__label" htmlFor="order-qty">Quantity (MOQ {formatQty(listing.tiers[0].min)} units)</label>
        <Stepper id="order-qty" value={qty} onChange={setQty} min={1} max={200000} />
      </div>
      <TierHint listing={listing} qty={qty} />
      <SummaryRows listing={listing} qty={qty} tier={tier} />
      <div className="flow-actions">
        <button type="button" className="btn btn--brand btn--pill" disabled={!tier} onClick={() => setStage('confirm')}>
          Review order
        </button>
      </div>
    </div>
  )
}

function SampleFlow({ listing, record, onClose }) {
  const [stage, setStage] = useState('configure')
  const [qty, setQty] = useState(2)

  if (stage === 'requested') {
    return (
      <SuccessBox title="Sample requested — supplier notified" onDone={onClose}>
        <p className="success-box__sub">
          {qty} unit{qty === 1 ? '' : 's'} of “{listing.name}” ship in 5–7 business days. Tracking appears in your Aekovera thread.
        </p>
        <span className="success-box__po">Brief auto-attached · {SAMPLE_SPEC_SHEET}</span>
      </SuccessBox>
    )
  }

  return (
    <div>
      <div className="flow-row">
        <label className="flow-row__label" htmlFor="sample-qty">Sample units (1–5)</label>
        <Stepper id="sample-qty" value={qty} onChange={(n) => setQty(Math.max(1, Math.min(5, n)))} min={1} max={5} />
      </div>
      <p className="qty-hint qty-hint--tier">Free sample · ships in 5–7 business days</p>
      <span className="mail__attach">Brief auto-attached · {SAMPLE_SPEC_SHEET}</span>
      <div className="flow-actions">
        <button
          type="button"
          className="btn btn--brand btn--pill"
          onClick={() => {
            record(`Sample requested · ${qty} unit${qty === 1 ? '' : 's'}`)
            setStage('requested')
          }}
        >
          Request sample
        </button>
      </div>
      <p className="flow-note">Simulated — the supplier is notified inside this demo only</p>
    </div>
  )
}

function EmailFlow({ listing, record, onClose }) {
  const [stage, setStage] = useState('compose')
  const prefill = useMemo(() => rfqEmailFor(listing), [listing])
  const [subject, setSubject] = useState(prefill.subject)
  const [body, setBody] = useState(prefill.body)
  const canSend = subject.trim() !== '' && body.trim() !== ''

  if (stage === 'sent') {
    return (
      <SuccessBox title="Email sent — RFQ thread opened" onDone={onClose}>
        <p className="success-box__sub">
          Your RFQ is on its way to the {listing.supplier} team. Replies route to your Aekovera inbox, with the brief attached for context.
        </p>
        <span className="success-box__po">Brief auto-attached · {SAMPLE_SPEC_SHEET}</span>
      </SuccessBox>
    )
  }

  return (
    <div className="mail-editor">
      <div className="flow-row flow-row--stack">
        <label className="flow-row__label" htmlFor="rfq-to">To</label>
        <input className="mail-field mail-field--to" id="rfq-to" value={`${listing.supplier} · sales team`} readOnly />
      </div>
      <div className="flow-row flow-row--stack">
        <label className="flow-row__label" htmlFor="rfq-subject">Subject</label>
        <input className="mail-field mail-field--subject" id="rfq-subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
      </div>
      <div className="flow-row flow-row--stack">
        <label className="flow-row__label" htmlFor="rfq-body">Message</label>
        <textarea className="mail-field" id="rfq-body" rows={14} value={body} onChange={(e) => setBody(e.target.value)} />
      </div>
      <span className="mail__attach">Brief auto-attached · {SAMPLE_SPEC_SHEET}</span>
      <div className="flow-actions">
        <button
          type="button"
          className="btn btn--brand btn--pill"
          disabled={!canSend}
          onClick={() => {
            record('RFQ email sent')
            setStage('sent')
          }}
        >
          <SendIcon size={14} /> Send email
        </button>
      </div>
      <p className="flow-note">Simulated — no real email leaves this demo</p>
    </div>
  )
}

export default function FlowModal({ listing, flowType, onClose, onRecord }) {
  const meta = FLOW_META[flowType]
  const FlowIcon = meta.icon

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const record = (label) => onRecord(listing.id, { id: `${listing.id}:${flowType}`, label })

  return (
    <div className="flow-overlay" onClick={onClose}>
      <div className="flow-modal" role="dialog" aria-modal="true" aria-label={`${meta.title} — ${listing.name}`} onClick={(e) => e.stopPropagation()}>
        <header className="flow-modal__head">
          <div>
            <p className="flow-modal__kicker">
              <FlowIcon size={13} /> {listing.supplier}
            </p>
            <h2 className="flow-modal__title">{meta.title}</h2>
            <p className="flow-modal__sub">{listing.name} · <ClockIcon size={11} /> {listing.leadTime}</p>
          </div>
          <button type="button" className="flow-modal__close" aria-label="Close" onClick={onClose}>
            <XIcon size={18} />
          </button>
        </header>
        <div className="flow-modal__body">
          {flowType === 'order' && <OrderFlow listing={listing} record={record} onClose={onClose} />}
          {flowType === 'sample' && <SampleFlow listing={listing} record={record} onClose={onClose} />}
          {flowType === 'email' && <EmailFlow listing={listing} record={record} onClose={onClose} />}
        </div>
      </div>
    </div>
  )
}
