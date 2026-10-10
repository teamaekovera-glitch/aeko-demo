/**
 * Product card for the packaging grid — image, category, title, supplier,
 * and the honest price/MOQ line. Commercial values render through the
 * format helpers ("Ask the supplier" when the seed stores null); the capture
 * date lives on the detail page, not the card.
 */

import { Link } from 'react-router-dom'
import { formatMoq, formatPriceLine, formatPerUnit, priceTypeLabel } from '../../lib/packaging/format'
import { usePackagingBasket } from '../../state/packagingBasket'

export default function ProductCard({ product }) {
  const { addItem, items } = usePackagingBasket()
  const inBasket = items.some((it) => it.product.id === product.id)
  const perUnit = formatPerUnit(product.priceUnit, product.priceBasis)

  return (
    <article className="card pkg-card">
      <Link to={`/packaging/products/${product.id}`} aria-label={product.title}>
        <img
          className="pkg-card__img"
          src={product.primaryImage.url}
          alt={product.primaryImage.alt}
          loading="lazy"
        />
      </Link>
      <div className="pkg-card__body">
        <span className="pkg-card__cat">{product.categoryName}</span>
        <h3 className="pkg-card__title">
          <Link to={`/packaging/products/${product.id}`}>{product.title}</Link>
        </h3>
        <p className="pkg-card__meta">
          {product.material} · {product.stockOrCustom === 'STOCK' ? 'Stock' : 'Custom'}
        </p>
        <p className="pkg-card__supplier">
          by{' '}
          <Link to={`/packaging/suppliers/${product.supplier.slug}`}>{product.supplier.name}</Link>
          {product.supplier.isPartner && <span className="badge-partner">Partner</span>}
        </p>
        <p className="pkg-card__price">
          {product.basePrice === null ? (
            <>
              {priceTypeLabel(product.priceType) === 'Quote only' ? (
                'Ask the supplier'
              ) : (
                <>Ask the supplier · {priceTypeLabel(product.priceType)}</>
              )}
            </>
          ) : (
            <>
              {formatPriceLine(product.basePrice, product.priceBasis)}
              {perUnit && <span className="pkg-pricebox__unit"> · {perUnit}</span>}
            </>
          )}
          <span className="pkg-card__meta" style={{ display: 'block' }}>
            MOQ: {formatMoq(product.moq, product.moqUnit)}
          </span>
        </p>
        <button
          type="button"
          className={`btn ${inBasket ? 'btn--ghost' : 'btn--brand'} btn--sm`}
          onClick={() => addItem(product.id, product.moq ?? 1)}
        >
          {inBasket ? 'In quote basket ✓' : 'Add to quote basket'}
        </button>
      </div>
    </article>
  )
}
