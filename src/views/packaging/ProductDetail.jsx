/**
 * /packaging/products/:id — product detail.
 *
 * Ported from aekobaba_new src/app/products/[id]/page.tsx: the full
 * commercial block (dated price + basis, per-unit figure, MOQ, stock/custom,
 * sample-verified flag), quantity breaks with the source's break-range
 * labels, provenance (source URL + capture date), and add-to-basket with a
 * quantity input. A below-MOQ quantity is allowed but flagged — the MOQ is a
 * supplier fact, and the UI never silently edits it.
 */

import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { findProduct } from '../../lib/packaging/catalog'
import { usePackagingBasket } from '../../state/packagingBasket'
import ProductCard from '../../components/packaging/ProductCard'
import {
  formatBreakRange,
  formatCaptureDate,
  formatLeadTime,
  formatMoq,
  formatMoney,
  formatPerUnit,
  formatPriceLine,
  priceTypeLabel,
} from '../../lib/packaging/format'

function ProductNotFound() {
  return (
    <section className="marketplace pkg-page">
      <div className="marketplace__texture bg-grid mask-radial" aria-hidden="true" />
      <div className="pkg-page__inner">
        <div className="pkg-empty">
          <p className="pkg-empty__title">Product not found</p>
          <p className="pkg-empty__sub">
            This product isn&apos;t in the packaging dataset. It may have been removed — the
            catalog is a fixed snapshot.
          </p>
          <Link to="/packaging/results" className="btn btn--brand">
            Browse all packaging
          </Link>
        </div>
      </div>
    </section>
  )
}

export default function PackagingProduct() {
  const { id } = useParams()
  const product = findProduct(id)
  const { addItem, items } = usePackagingBasket()
  const [qty, setQty] = useState('')

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [id])

  if (!product) return <ProductNotFound />

  const inBasket = items.some((it) => it.product.id === product.id)
  const qtyNum = Number.parseInt(qty, 10)
  const belowMoq =
    Number.isFinite(qtyNum) && product.moq !== null && qtyNum > 0 && qtyNum < product.moq

  const addToBasket = () => {
    addItem(product.id, Number.isFinite(qtyNum) && qtyNum > 0 ? qtyNum : (product.moq ?? 1))
  }

  return (
    <section className="marketplace pkg-page">
      <div className="marketplace__texture bg-grid mask-radial" aria-hidden="true" />
      <div className="pkg-page__inner">
        <nav className="pkg-crumbs" aria-label="Breadcrumb">
          <Link to="/packaging">Packaging</Link>
          <span aria-hidden="true">/</span>
          <Link to={`/packaging/results?category=${product.categorySlug}`}>
            {product.categoryName}
          </Link>
          <span aria-hidden="true">/</span>
          <span>{product.title}</span>
        </nav>

        <div className="pkg-detail">
          <img
            className="pkg-detail__img"
            src={product.primaryImage.url}
            alt={product.primaryImage.alt}
          />

          <div>
            <span className="pkg-detail__cat">{product.categoryName}</span>
            <h1 className="pkg-detail__title">{product.title}</h1>
            <p className="pkg-card__supplier">
              by{' '}
              <Link to={`/packaging/suppliers/${product.supplier.slug}`}>
                {product.supplier.name}
              </Link>{' '}
              · {product.supplier.location}
            </p>

            <div className="pkg-pricebox">
              <span className="pkg-pricebox__line">
                {formatPriceLine(product.basePrice, product.priceBasis)}
              </span>
              {product.priceUnit !== null && (
                <span className="pkg-pricebox__unit">
                  {formatPerUnit(product.priceUnit, product.priceBasis)}
                </span>
              )}
              <div className="pkg-pricebox__facts">
                <span>
                  MOQ <strong>{formatMoq(product.moq, product.moqUnit)}</strong>
                </span>
                <span>
                  Sourcing{' '}
                  <strong>{product.stockOrCustom === 'STOCK' ? 'Stock' : 'Custom'}</strong>
                </span>
                <span>
                  Lead time <strong>{formatLeadTime(product.leadTimeDays)}</strong>
                </span>
                <span>
                  Samples{' '}
                  <strong>
                    {product.samplePolicyVerified
                      ? 'Confirmed on supplier page'
                      : 'Ask the supplier'}
                  </strong>
                </span>
                <span>
                  Pricing <strong>{priceTypeLabel(product.priceType)}</strong>
                </span>
              </div>
              {product.priceBasis === null && product.basePrice !== null && (
                <p className="pkg-facet__note">
                  The supplier hasn&apos;t published a pricing basis for this figure — treat the
                  number as indicative only.
                </p>
              )}
            </div>

            {product.quantityBreaks.length > 0 && (
              <table className="pkg-breaks">
                <thead>
                  <tr>
                    <th scope="col">Quantity</th>
                    <th scope="col">Unit price</th>
                  </tr>
                </thead>
                <tbody>
                  {product.quantityBreaks.map((brk) => (
                    <tr key={`${brk.minQty}-${brk.maxQty ?? 'open'}`}>
                      <td>{formatBreakRange(brk.minQty, brk.maxQty)}</td>
                      <td>
                        {brk.unitPrice === null
                          ? 'Ask the supplier'
                          : formatMoney(brk.unitPrice, product.priceBasis)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {product.certificationNames.length > 0 && (
              <div className="pkg-chips">
                {product.certificationNames.map((cert) => (
                  <span key={cert} className="chip">
                    {cert}
                  </span>
                ))}
              </div>
            )}

            <div className="pkg-qty">
              <input
                type="number"
                min="1"
                aria-label="Quantity"
                placeholder={`Qty (${formatMoq(product.moq, product.moqUnit)})`}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
              <button
                type="button"
                className={`btn ${inBasket ? 'btn--ghost' : 'btn--brand'}`}
                onClick={addToBasket}
              >
                {inBasket ? 'In quote basket ✓ — add again to update' : 'Add to quote basket'}
              </button>
              {belowMoq && (
                <p className="pkg-qty__warn">
                  Below the {product.moq.toLocaleString('en-US')}-unit MOQ this supplier published
                  on {formatCaptureDate(product.sourceCapturedAt)} — they may decline or reprice.
                </p>
              )}
            </div>

            <div className="pkg-provenance">
              Price, MOQ, and lead time captured from the supplier&apos;s own page (
              <a href={product.sourceUrl} target="_blank" rel="noreferrer">
                {product.sourceUrl}
              </a>
              ) on {formatCaptureDate(product.sourceCapturedAt)} · {product.sourceCapturedAt} UTC.
              Representative imagery, not supplier stock photos. Fictional demo data.
            </div>
          </div>
        </div>

        <div className="pkg-section">
          <div className="pkg-section__head">
            <h2 className="pkg-section__title">More from {product.supplier.name}</h2>
            <Link
              to={`/packaging/suppliers/${product.supplier.slug}`}
              className="pkg-section__link"
            >
              Supplier profile →
            </Link>
          </div>
          {product.supplier.products.filter((p) => p.id !== product.id).length === 0 ? (
            <p className="pkg-facet__note">
              This is the only product {product.supplier.name} lists in the snapshot.
            </p>
          ) : (
            <div className="pkg-grid">
              {product.supplier.products
                .filter((p) => p.id !== product.id)
                .map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
