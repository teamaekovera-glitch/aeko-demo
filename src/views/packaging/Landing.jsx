/**
 * /packaging — the Aekobaba packaging marketplace landing.
 *
 * Ported from aekobaba_new src/app/page.tsx: "What are you packaging?"
 * hero search over the taxonomy, popular-search chips, category grid with
 * live product counts, featured rail (verified-first interleaved), supplier
 * strip, and the dataset provenance note. All data is local and
 * deterministic; commercial facts render through the format helpers so
 * unpublished values stay "Ask the supplier".
 */

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { categories, allProducts, allSuppliers, datasetMeta } from '../../lib/packaging/catalog'
import { HERO_IMAGE_URL } from '../../lib/packaging/images'
import { selectFeaturedProducts } from '../../lib/packaging/featured'
import { POPULAR_SEARCHES, popularSearchUrl } from '../../lib/packaging/popular'
import { formatCaptureDate, supplierStatusLabel } from '../../lib/packaging/format'
import { usePackagingBasket } from '../../state/packagingBasket'
import ProductCard from '../../components/packaging/ProductCard'
import { SearchIcon } from '../../components/icons.jsx'

/** Verified suppliers first, then name order — the directory's headline set. */
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

/** Header basket link — count lives here, never in the shared TopNav. */
function BasketLink() {
  const { items } = usePackagingBasket()
  return (
    <Link to="/packaging/basket" className="pkg-basket-link pkg-section__link">
      Quote basket
      {items.length > 0 && <span className="pkg-basket-count">{items.length}</span>}
    </Link>
  )
}

export default function PackagingLanding() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  const featured = selectFeaturedProducts(allProducts)
  const withProducts = allSuppliers.filter((s) => s.products.length > 0)
  const supplierStrip = [...withProducts]
    .sort(
      (a, b) =>
        (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9) || a.name.localeCompare(b.name),
    )
    .slice(0, 6)

  const submit = (e) => {
    e.preventDefault()
    const q = query.trim()
    navigate(q ? `/packaging/results?q=${encodeURIComponent(q)}` : '/packaging/results')
  }

  return (
    <section className="marketplace pkg-page">
      <div className="marketplace__texture bg-grid mask-radial" aria-hidden="true" />
      <div className="pkg-page__inner">
        <div className="pkg-hero">
          <div className="pkg-hero__inner">
            <div>
              <p className="eyebrow">
                <span className="eyebrow__dash" /> Packaging · Marketplace
              </p>
              <h1 className="pkg-hero__title">
                What are you <span className="serif-accent">packaging?</span>
              </h1>
              <p className="pkg-hero__note">
                {allProducts.length} packaging SKUs from {allSuppliers.length} suppliers — prices
                and MOQs captured from supplier pages as dated snapshots. If a supplier hasn&apos;t
                published a number, it says so.
              </p>
              <form className="pkg-search" onSubmit={submit}>
                <div className="brief-bar mkt-search">
                  <SearchIcon size={18} className="brief-bar__spark" />
                  <input
                    className="brief-bar__input"
                    aria-label="What are you packaging?"
                    placeholder="e.g. hot sauce, skincare, coffee…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn btn--brand btn--pill">
                  Search
                </button>
              </form>
              <div className="pkg-popular">
                <span>Popular:</span>
                {POPULAR_SEARCHES.map((entry) => (
                  <Link key={entry.label} className="chip" to={popularSearchUrl(entry)}>
                    {entry.label}
                  </Link>
                ))}
              </div>
            </div>
            <img
              className="pkg-hero__img"
              src={HERO_IMAGE_URL}
              alt="Representative packaging lineup — pouches, bottles, jars and cartons"
            />
          </div>
        </div>

        <div className="pkg-section">
          <div className="pkg-section__head">
            <h2 className="pkg-section__title">Browse by category</h2>
            <Link to="/packaging/results" className="pkg-section__link">
              View everything →
            </Link>
          </div>
          <div className="pkg-cats">
            {categories.map((category) => (
              <Link
                key={category.slug}
                className="pkg-cat"
                to={`/packaging/results?category=${category.slug}`}
              >
                <span className="pkg-cat__name">{category.name}</span>
                <span className="pkg-cat__count">
                  {category.productCount} product{category.productCount === 1 ? '' : 's'}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="pkg-section">
          <div className="pkg-section__head">
            <h2 className="pkg-section__title">Featured packaging</h2>
            <BasketLink />
          </div>
          <div className="pkg-grid">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>

        <div className="pkg-section">
          <div className="pkg-section__head">
            <h2 className="pkg-section__title">Suppliers</h2>
            <Link to="/packaging/suppliers" className="pkg-section__link">
              Full directory →
            </Link>
          </div>
          <div className="pkg-rows">
            {supplierStrip.map((supplier) => (
              <article key={supplier.slug} className="card pkg-row">
                <div>
                  <h3 className="pkg-row__name">
                    <Link to={`/packaging/suppliers/${supplier.slug}`}>{supplier.name}</Link>
                  </h3>
                  <div className="pkg-row__meta">
                    <StatusBadge status={supplier.status} />
                    <span>{supplier.location}</span>
                    <span>
                      {supplier.products.length} product{supplier.products.length === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>
                <div className="pkg-row__side">
                  {supplier.reviewScore !== null
                    ? `${supplier.reviewScore.toFixed(1)} ★ (${supplier.reviewCount})`
                    : 'No reviews yet'}
                </div>
                <Link
                  to={`/packaging/suppliers/${supplier.slug}`}
                  className="btn btn--ghost btn--sm"
                >
                  View profile
                </Link>
              </article>
            ))}
          </div>
        </div>

        <p className="pkg-provenance">
          Dataset: {allProducts.length} products · {allSuppliers.length} suppliers ·{' '}
          {categories.length} categories · transcribed{' '}
          {formatCaptureDate(datasetMeta.transcribedAt)} from dated supplier-page captures. Every
          price, MOQ, and certification links to the page it was read from, with the capture date.
          Fictional demo data — no live supplier connection.
        </p>
      </div>
    </section>
  )
}
