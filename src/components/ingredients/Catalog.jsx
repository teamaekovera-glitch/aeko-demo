/**
 * Provenance-first catalog components for the Ingredients prototype —
 * semantics ported from the marketplace's src/components/catalog/* and
 * src/components/discovery/*, restyled with the aeko-demo component
 * vocabulary (card, tag, badge-*, chip, mkt-*).
 *
 * Rendering rule: every fact renders with its claim-level source
 * (SourceLink / SourceCitation) or the Unknown label — never a blank,
 * zero, or inferred value. Quarantined rows never reach this layer
 * (the merge gate filters them), so no withheld row can leak.
 */

import { UNKNOWN_LABEL, certificationChipLabel, priceFlag, priceTierLabel } from '../../lib/ingredients/display.js'

function sourceTitle(source) {
  return `Source: ${source.url} · retrieved ${source.retrievedAt}`
}

/** Citation link for claims whose value is not itself a link. */
export function SourceCitation({ source }) {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      title={sourceTitle(source)}
      className="source-cite"
    >
      Source<span aria-hidden="true">↗</span>
    </a>
  )
}

/** A claimed fact, linked to the page it was read from — the value is the link. */
export function SourceLink({ sourced, className }) {
  return (
    <a
      href={sourced.source.url}
      target="_blank"
      rel="noopener noreferrer"
      title={sourceTitle(sourced.source)}
      className={`source-link ${className ?? ''}`}
    >
      {sourced.value}
    </a>
  )
}

/** The Unknown label — fixed, never restyled into something that reads as data. */
export function UnknownField() {
  return <span className="unknown-field">{UNKNOWN_LABEL}</span>
}

/** A sourced string fact, or the Unknown label when no source exists. */
export function SourcedText({ sourced }) {
  if (!sourced) return <UnknownField />
  return <SourceLink sourced={sourced} />
}

/** Field label + fact value; the fact is a SourceLink or the Unknown label. */
export function FactField({ label, children, wide = false }) {
  return (
    <div className={`fact-field ${wide ? 'fact-field--wide' : ''}`} data-fact-field={label}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

/** A sourced list claim rendered as verbatim chips with the claim's citation. */
export function ChipList({ sourced, cap }) {
  const items = sourced.value
  const shown = cap ? items.slice(0, cap) : items
  const rest = items.length - shown.length
  return (
    <span className="chip-list">
      {shown.map((item) => (
        <span key={item} className="tag">
          {item}
        </span>
      ))}
      {rest > 0 && (
        <span className="tag tag--more" title={`${rest} more — see the full profile`}>
          +{rest} more
        </span>
      )}
      <SourceCitation source={sourced.source} />
    </span>
  )
}

function ShieldGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    </svg>
  )
}

/** Row-level research provenance: how the row was verified, with what confidence. */
export function ProvenanceBadge({ supplier }) {
  return (
    <span className="provenance-badge">
      <span className="badge-muted">
        <ShieldGlyph /> {supplier.verificationLevel}
      </span>
      <span className="badge-muted">Confidence: {supplier.confidence}</span>
    </span>
  )
}

/**
 * One price signal: tier badge (Rulebook B1), the verbatim published figure,
 * the verbatim staleness qualifier with its flag badge where one applies,
 * and the source the claim was read from on the date shown.
 */
export function PriceSignalRow({ signal, index }) {
  const flag = priceFlag(signal)
  return (
    <li className="price-signal" data-fact-field={`price-signal-${index + 1}`}>
      <span className={`fact-badge ${signal.tier === 'quote-only' ? 'fact-badge--quote' : 'fact-badge--tier'}`}>
        {priceTierLabel(signal.tier)}
      </span>
      {signal.value ? <span className="price-signal__value">{signal.value}</span> : null}
      {flag && <span className={`flag-badge flag-badge--${flag.kind}`}>{flag.label}</span>}
      {signal.staleness && <span className="price-signal__staleness">{signal.staleness}</span>}
      {signal.note && <span className="price-signal__note">{signal.note}</span>}
      <SourceCitation source={signal.source} />
    </li>
  )
}

/** Certification chips, exactly as the supplier states them (Rulebook C10/C11). */
export function CertificationList({ supplier }) {
  if (supplier.certifications.value.length === 0) {
    return <p className="cert-empty">None listed on the reviewed page.</p>
  }
  return (
    <ul className="cert-list">
      {supplier.certifications.value.map((cert) => (
        <li key={cert.name} className="cert-list__item">
          <span className="tag tag--cert">
            {cert.name} · {certificationChipLabel(cert.status)}
          </span>
          <SourceCitation source={cert.source} />
        </li>
      ))}
    </ul>
  )
}
