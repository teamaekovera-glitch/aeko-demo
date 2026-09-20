// Marketplace listing card — catalog summary plus expandable detail
// (tiered pricing, specs, review breakdown + quotes) and the three actions.

import StarRating from '../StarRating.jsx'
import ProductArt from './ProductArt.jsx'
import {
  MapPinIcon,
  ShieldCheckIcon,
  ChevronDownIcon,
  ClipboardListIcon,
  PackageIcon,
  MailIcon,
  CheckCircleIcon,
  ClockIcon,
} from '../icons.jsx'
import {
  applicableTier,
  formatUsd,
  formatQty,
} from '../../data/packaging.js'

function ActivityLine({ label }) {
  return (
    <p className="listing__activity-line">
      <CheckCircleIcon size={13} /> {label}
    </p>
  )
}

export default function ListingCard({ listing, activities, detailOpen, onToggleDetail, onOpenFlow }) {
  const { name, supplier, location, partner, rating, reviewCount, tiers, specs, quotes } = listing
  const entryTier = tiers[0]
  const bestTier = tiers.at(-1)

  return (
    <article className={`card listing ${partner ? 'listing--partner' : 'listing--community'}`}>
      <div className="listing__art" aria-hidden="true">
        <ProductArt variant={listing.art} />
      </div>

      <div className="listing__body">
        <div className="listing__id">
          <h3 className="listing__name">{name}</h3>
          <p className="listing__supplier">
            {partner && (
              <span className="badge-partner">
                <ShieldCheckIcon size={12} />
                Aekovera Partner · Recommended
              </span>
            )}
            {!partner && <span className="badge-muted">Community listing</span>}
            <span className="listing__supplier-name">{supplier}</span>
          </p>
          <div className="listing__rating">
            <StarRating rating={rating} reviews={reviewCount} />
          </div>
        </div>

        {listing.tags.length > 0 && (
          <div className="supplier-card__tags">
            {listing.tags.map((t) => (
              <span key={t} className={`tag ${t.startsWith('Recommended') || t.startsWith('Low MOQ') ? 'tag--brand' : ''}`}>
                {t}
              </span>
            ))}
          </div>
        )}

        <div className="listing__price-row">
          <span className="listing__price">
            {formatUsd(entryTier.price)}
            <span className="listing__price-unit"> / unit</span>
          </span>
          <span className="listing__price-low">as low as {formatUsd(bestTier.price)} at {formatQty(bestTier.min)}+</span>
        </div>

        <div className="listing__meta">
          <span>MOQ {formatQty(entryTier.min)} units</span>
          <span><ClockIcon size={12} /> {listing.leadTime}</span>
          <span><MapPinIcon size={12} /> {location}</span>
        </div>

        <div className="listing__actions">
          <button type="button" className="btn btn--brand btn--sm" onClick={() => onOpenFlow('order')}>
            <ClipboardListIcon size={14} /> Place order
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => onOpenFlow('sample')}>
            <PackageIcon size={14} /> Request sample
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => onOpenFlow('email')}>
            <MailIcon size={14} /> Email supplier
          </button>
        </div>

        <button
          type="button"
          className={`listing__expand ${detailOpen ? 'listing__expand--open' : ''}`}
          aria-expanded={detailOpen}
          onClick={onToggleDetail}
        >
          Pricing, specs &amp; reviews
          <ChevronDownIcon size={14} />
        </button>
      </div>

      {detailOpen && (
        <div className="listing__detail">
          <div>
            <p className="listing__detail-label">Volume pricing</p>
            <div className="tier-table">
              {tiers.map((t) => {
                const atMoq = applicableTier(tiers, entryTier.min)?.min === t.min
                return (
                  <div key={t.min} className={`tier-row ${atMoq ? 'tier-row--moq' : ''}`}>
                    <span className="tier-row__qty">{formatQty(t.min)}+ units</span>
                    <span className="tier-row__price">
                      {formatUsd(t.price)} <em>/ unit</em>
                      {t === bestTier && <span className="badge-success">Best rate</span>}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div>
            <p className="listing__detail-label">Specifications</p>
            <dl className="supplier-card__specs">
              {specs.map((s) => (
                <div key={s.label}>
                  <dt>{s.label}</dt>
                  <dd>{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div>
            <p className="listing__detail-label">Reviews · {rating.toFixed(1)} from {formatQty(reviewCount)} buyers</p>
            <div className="review-bars" role="img" aria-label={`Rating breakdown: ${listing.breakdown[5]}% five stars`}>
              {[5, 4, 3, 2, 1].map((star) => (
                <div key={star} className="review-bar">
                  <span>{star}★</span>
                  <span className="review-bar__track">
                    <span className="review-bar__fill" style={{ width: `${listing.breakdown[star]}%` }} />
                  </span>
                  <span>{listing.breakdown[star]}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="supplier-card__quotes listing__detail-quotes">
            {quotes.map((q) => (
              <blockquote key={q.author} className="quote">
                <p>“{q.text}”</p>
                <footer>— {q.author} · {q.date}</footer>
              </blockquote>
            ))}
          </div>
        </div>
      )}

      {activities.length > 0 && (
        <div className="listing__activity">
          {activities.map((a) => (
            <ActivityLine key={a.id} label={a.label} />
          ))}
        </div>
      )}
    </article>
  )
}
