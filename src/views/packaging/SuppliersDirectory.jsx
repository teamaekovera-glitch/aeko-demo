/**
 * /packaging/suppliers — supplier directory (derived).
 *
 * aekobaba has no standalone directory page (suppliers were reachable only
 * from products), so this view is derived from the seed: one row per
 * supplier, verified statuses first, then name order. Empty-catalog
 * suppliers are shown with an honest zero rather than hidden.
 */

import { Link } from 'react-router-dom'
import { allSuppliers } from '../../lib/packaging/catalog'
import { formatCaptureDate, supplierStatusLabel } from '../../lib/packaging/format'

const STATUS_ORDER = { RECOMMENDED: 0, LISTED: 1, QUOTE_ONLY: 2, PENDING: 3, DISABLED: 4 }
const STATUS_BADGE = {
  RECOMMENDED: 'pkg-badge--recommended',
  LISTED: 'pkg-badge--listed',
  PENDING: 'pkg-badge--pending',
}

function StatusBadge({ status }) {
  return (
    <span className={`pkg-badge ${STATUS_BADGE[status] ?? 'pkg-badge--muted'}`}>
      {supplierStatusLabel(status)}
    </span>
  )
}

export default function SuppliersDirectory() {
  const sorted = [...allSuppliers].sort(
    (a, b) =>
      (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9) || a.name.localeCompare(b.name),
  )
  const verified = sorted.filter((s) => s.status === 'RECOMMENDED' || s.status === 'LISTED').length

  return (
    <section className="marketplace pkg-page">
      <div className="marketplace__texture bg-grid mask-radial" aria-hidden="true" />
      <div className="pkg-page__inner">
        <nav className="pkg-crumbs" aria-label="Breadcrumb">
          <Link to="/packaging">Packaging</Link>
          <span aria-hidden="true">/</span>
          <span>Suppliers</span>
        </nav>

        <h1 className="pkg-section__title" style={{ marginBottom: '0.4rem' }}>
          Packaging suppliers
        </h1>
        <p className="pkg-facet__note" style={{ marginBottom: '1.2rem' }}>
          {allSuppliers.length} suppliers in the snapshot, {verified} with verified listings.
          Statuses, reviews, and legal identity come from the captured supplier pages.
        </p>

        <div className="pkg-rows">
          {sorted.map((supplier) => (
            <article key={supplier.slug} className="card pkg-row">
              <div>
                <h2 className="pkg-row__name">
                  <Link to={`/packaging/suppliers/${supplier.slug}`}>{supplier.name}</Link>
                </h2>
                <div className="pkg-row__meta">
                  <StatusBadge status={supplier.status} />
                  <span>{supplier.location}</span>
                  {supplier.legalIdentity && <span>{supplier.legalIdentity}</span>}
                </div>
                {supplier.certifications.length > 0 && (
                  <div className="pkg-chips">
                    {supplier.certifications.map((cert) => (
                      <span key={cert.name} className="chip">
                        {cert.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="pkg-row__side">
                {supplier.products.length > 0 ? (
                  <>
                    {supplier.products.length} product{supplier.products.length === 1 ? '' : 's'}
                    <br />
                    {supplier.reviewScore !== null
                      ? `${supplier.reviewScore.toFixed(1)} ★ (${supplier.reviewCount})`
                      : 'No reviews yet'}
                    <br />
                    Captured {formatCaptureDate(supplier.sourceCapturedAt)}
                  </>
                ) : (
                  <>
                    No products listed yet
                    <br />
                    Captured {formatCaptureDate(supplier.sourceCapturedAt)}
                  </>
                )}
              </div>
              <Link to={`/packaging/suppliers/${supplier.slug}`} className="btn btn--ghost btn--sm">
                View profile
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
