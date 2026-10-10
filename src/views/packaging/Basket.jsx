/**
 * /packaging/basket — multi-supplier quote basket.
 *
 * Ported from aekobaba_new src/app/basket: editable quantity rows, per-row
 * MOQ and price honesty (dated snapshots, "Ask the supplier" where
 * unpublished), and the one simulated multi-supplier submit. Per-unit prices
 * with differing bases are never totalled — the source app quoted per item.
 * Submit is deterministic and local: a fictional PKQ id, nothing sent.
 */

import { Link } from 'react-router-dom'
import { usePackagingBasket } from '../../state/packagingBasket'
import {
  formatCaptureDate,
  formatMoq,
  formatPerUnit,
  formatPriceLine,
} from '../../lib/packaging/format'

/** One basket row: image, links, editable quantity, per-row facts. */
function BasketRow({ item, onQuantity, onRemove }) {
  const { product, quantity } = item
  const belowMoq = product.moq !== null && quantity < product.moq
  const perUnit = formatPerUnit(product.priceUnit, product.priceBasis)
  return (
    <div className="card pkg-basket-row">
      <img className="pkg-basket-row__img" src={product.primaryImage.url} alt={product.primaryImage.alt} />
      <div>
        <Link to={`/packaging/products/${product.id}`} className="pkg-card__title">
          {product.title}
        </Link>
        <p className="pkg-card__meta">
          {product.supplier.name} · MOQ {formatMoq(product.moq, product.moqUnit)} ·{' '}
          {formatPriceLine(product.basePrice, product.priceBasis)}
          {perUnit && <> · {perUnit}</>}
        </p>
        {belowMoq && (
          <p className="pkg-qty__warn">
            {quantity.toLocaleString('en-US')} is below this supplier&apos;s published MOQ of{' '}
            {product.moq.toLocaleString('en-US')} (captured{' '}
            {formatCaptureDate(product.sourceCapturedAt)}) — they may decline or reprice.
          </p>
        )}
      </div>
      <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
        <label style={{ display: 'contents' }}>
          <span className="pkg-facet__note">Qty</span>
          <input
            type="number"
            min="0"
            className="pkg-basket-row__qty"
            value={quantity}
            aria-label={`Quantity for ${product.title}`}
            onChange={(e) => onQuantity(e.target.value)}
          />
        </label>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onRemove}>
          Remove
        </button>
      </div>
    </div>
  )
}

/** Confirmed simulated submit — the success state with the fictional id. */
function ConfirmCard({ request, onDone }) {
  return (
    <div className="pkg-confirm">
      <p className="pkg-card__title" style={{ marginTop: 0 }}>
        Quote request sent
      </p>
      <p className="pkg-confirm__id">{request.id}</p>
      <p className="pkg-basket-summary__note">
        {request.itemCount} item{request.itemCount === 1 ? '' : 's'} across{' '}
        {request.supplierCount} supplier{request.supplierCount === 1 ? '' : 's'}. On the source
        platform this routes to each supplier&apos;s inbox; in this demo it stops here — nothing
        was sent and no supplier was contacted. Quotes would arrive in the request thread
        afterwards.
      </p>
      <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem' }}>
        <button type="button" className="btn btn--brand" onClick={onDone}>
          Keep browsing
        </button>
        <Link to="/packaging/results" className="btn btn--ghost">
          Back to catalog
        </Link>
      </div>
    </div>
  )
}

export default function PackagingBasket() {
  const { items, hydrated, submitted, setQuantity, removeItem, clear, submit, dismissSubmission } =
    usePackagingBasket()

  if (submitted) {
    return (
      <section className="marketplace pkg-page">
        <div className="marketplace__texture bg-grid mask-radial" aria-hidden="true" />
        <div className="pkg-page__inner">
          <ConfirmCard request={submitted} onDone={dismissSubmission} />
        </div>
      </section>
    )
  }

  if (!hydrated) {
    return (
      <section className="marketplace pkg-page">
        <div className="marketplace__texture bg-grid mask-radial" aria-hidden="true" />
        <div className="pkg-page__inner">
          <p className="pkg-facet__note">Loading your basket…</p>
        </div>
      </section>
    )
  }

  if (items.length === 0) {
    return (
      <section className="marketplace pkg-page">
        <div className="marketplace__texture bg-grid mask-radial" aria-hidden="true" />
        <div className="pkg-page__inner">
          <nav className="pkg-crumbs" aria-label="Breadcrumb">
            <Link to="/packaging">Packaging</Link>
            <span aria-hidden="true">/</span>
            <span>Quote basket</span>
          </nav>
          <div className="pkg-empty">
            <p className="pkg-empty__title">Your quote basket is empty</p>
            <p className="pkg-empty__sub">
              Add packaging from the catalog, then send one quote request to every supplier at
              once.
            </p>
            <Link to="/packaging/results" className="btn btn--brand">
              Browse packaging
            </Link>
          </div>
        </div>
      </section>
    )
  }

  // Group rows by supplier — the request is per-supplier on the source platform.
  const bySupplier = new Map()
  for (const item of items) {
    const slug = item.product.supplier.slug
    if (!bySupplier.has(slug)) bySupplier.set(slug, { supplier: item.product.supplier, rows: [] })
    bySupplier.get(slug).rows.push(item)
  }

  const supplierCount = bySupplier.size

  return (
    <section className="marketplace pkg-page">
      <div className="marketplace__texture bg-grid mask-radial" aria-hidden="true" />
      <div className="pkg-page__inner">
        <nav className="pkg-crumbs" aria-label="Breadcrumb">
          <Link to="/packaging">Packaging</Link>
          <span aria-hidden="true">/</span>
          <span>Quote basket</span>
        </nav>

        <div className="pkg-section__head">
          <h1 className="pkg-section__title">Quote basket</h1>
          <button type="button" className="pkg-clear" onClick={clear}>
            Remove all
          </button>
        </div>
        <p className="pkg-count">
          {items.length} item{items.length === 1 ? '' : 's'} across {supplierCount} supplier
          {supplierCount === 1 ? '' : 's'} — one request, sent to all of them
        </p>

        {[...bySupplier.values()].map(({ supplier, rows }) => (
          <div key={supplier.slug} style={{ marginTop: '1.2rem' }}>
            <div className="pkg-section__head">
              <h2 className="pkg-section__title">
                <Link to={`/packaging/suppliers/${supplier.slug}`}>{supplier.name}</Link>
              </h2>
              <span className="pkg-facet__note">
                {rows.length} item{rows.length === 1 ? '' : 's'}
              </span>
            </div>
            {rows.map((item) => (
              <BasketRow
                key={item.product.id}
                item={item}
                onQuantity={(value) => setQuantity(item.product.id, value)}
                onRemove={() => removeItem(item.product.id)}
              />
            ))}
          </div>
        ))}

        <div className="card pkg-basket-summary">
          <p className="pkg-basket-summary__note">
            Simulated request — the demo is keyless and sends nothing to anyone. Quantities are
            yours to set; MOQs and prices shown are the suppliers&apos; published snapshots, never
            edited by the interface. Per-unit prices with different bases aren&apos;t totalled —
            final quotes come from the suppliers.
          </p>
          <button
            type="button"
            className="btn btn--brand"
            onClick={() => {
              submit()
            }}
          >
            Request quotes from {supplierCount} supplier{supplierCount === 1 ? '' : 's'}
          </button>
        </div>
      </div>
    </section>
  )
}
