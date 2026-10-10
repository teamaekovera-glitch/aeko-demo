/**
 * /packaging/suppliers/:slug — supplier profile.
 *
 * Ported from aekobaba_new src/app/suppliers/[slug]/page.tsx: identity block
 * (status, location, legal identity, review + platform), certifications with
 * their per-cert provenance, and the supplier's product grid. Empty catalogs
 * get an honest state.
 */

import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { findSupplier } from '../../lib/packaging/catalog'
import { formatCaptureDate, supplierStatusLabel } from '../../lib/packaging/format'
import ProductCard from '../../components/packaging/ProductCard'

const STATUS_BADGE = {
  RECOMMENDED: 'pkg-badge--recommended',
  LISTED: 'pkg-badge--listed',
  PENDING: 'pkg-badge--pending',
}

function SupplierNotFound() {
  return (
    <section className="marketplace pkg-page">
      <div className="marketplace__texture bg-grid mask-radial" aria-hidden="true" />
      <div className="pkg-page__inner">
        <div className="pkg-empty">
          <p className="pkg-empty__title">Supplier not found</p>
          <p className="pkg-empty__sub">
            This supplier isn&apos;t in the packaging snapshot — the directory is a fixed capture,
            not a live registry.
          </p>
          <Link to="/packaging/suppliers" className="btn btn--brand">
            Browse all suppliers
          </Link>
        </div>
      </div>
    </section>
  )
}

export default function SupplierProfile() {
  const { slug } = useParams()
  const supplier = findSupplier(slug)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [slug])

  if (!supplier) return <SupplierNotFound />

  return (
    <section className="marketplace pkg-page">
      <div className="marketplace__texture bg-grid mask-radial" aria-hidden="true" />
      <div className="pkg-page__inner">
        <nav className="pkg-crumbs" aria-label="Breadcrumb">
          <Link to="/packaging">Packaging</Link>
          <span aria-hidden="true">/</span>
          <Link to="/packaging/suppliers">Suppliers</Link>
          <span aria-hidden="true">/</span>
          <span>{supplier.name}</span>
        </nav>

        <div className="pkg-section__head" style={{ marginTop: '1rem' }}>
          <h1 className="pkg-section__title">
            {supplier.name}{' '}
            <span className={`pkg-badge ${STATUS_BADGE[supplier.status] ?? 'pkg-badge--muted'}`}>
              {supplierStatusLabel(supplier.status)}
            </span>
          </h1>
        </div>
        <p className="pkg-facet__note">
          {supplier.location}
          {supplier.legalIdentity && <> · {supplier.legalIdentity}</>} ·{' '}
          {supplier.reviewScore !== null
            ? `${supplier.reviewScore.toFixed(1)} ★ from ${supplier.reviewCount} review${supplier.reviewCount === 1 ? '' : 's'} on ${supplier.reviewPlatform ?? 'the platform'}`
            : 'No reviews on file in the snapshot'}
        </p>

        {supplier.certifications.length > 0 && (
          <div className="pkg-chips" style={{ marginTop: '0.9rem' }}>
            {supplier.certifications.map((cert) => (
              <span
                key={cert.name}
                className="chip"
                title={`${cert.name} — captured from ${cert.sourceUrl} on ${formatCaptureDate(cert.sourceCapturedAt)}`}
              >
                {cert.name}
              </span>
            ))}
          </div>
        )}

        <div className="pkg-section" style={{ marginTop: '1.4rem' }}>
          <div className="pkg-section__head">
            <h2 className="pkg-section__title">Products ({supplier.products.length})</h2>
            <Link to="/packaging/results" className="pkg-section__link">
              Browse everything →
            </Link>
          </div>
          {supplier.products.length === 0 ? (
            <div className="pkg-empty">
              <p className="pkg-empty__title">No products listed yet</p>
              <p className="pkg-empty__sub">
                {supplier.name} is in the snapshot — its page was captured on{' '}
                {formatCaptureDate(supplier.sourceCapturedAt)} — but it had no products listed at
                capture time.
              </p>
            </div>
          ) : (
            <div className="pkg-grid">
              {supplier.products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>

        <p className="pkg-provenance">
          Supplier status, reviews, and certifications captured from{' '}
          <a href={supplier.sourceUrl} target="_blank" rel="noreferrer">
            {supplier.sourceUrl}
          </a>{' '}
          on {formatCaptureDate(supplier.sourceCapturedAt)} · {supplier.sourceCapturedAt} UTC.
          {supplier.reviewSource && (
            <>
              {' '}
              Review data from{' '}
              <a href={supplier.reviewSource.sourceUrl} target="_blank" rel="noreferrer">
                {supplier.reviewSource.sourceUrl}
              </a>{' '}
              on {formatCaptureDate(supplier.reviewSource.sourceCapturedAt)}.
            </>
          )}{' '}
          Fictional demo data — no live supplier connection.
        </p>
      </div>
    </section>
  )
}
