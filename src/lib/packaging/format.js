/**
 * Display formatting for packaging catalog values.
 *
 * Ported 1:1 from aekobaba_new src/lib/catalog/format.ts (the port keeps the
 * truth rule verbatim): a value the supplier never published formats as
 * "Ask the supplier" — never a default, midpoint, or estimate. Every money
 * and provenance string the UI shows goes through this module.
 */

/**
 * Currency the capture names, read from the basis text — the seed has no
 * currency field, but every published basis states one (USD/GBP/EUR).
 * Returns null when absent so no symbol is ever invented.
 */
export function currencyOf(priceBasis) {
  if (!priceBasis) return null
  if (/USD/.test(priceBasis)) return 'USD'
  if (/GBP/.test(priceBasis)) return 'GBP'
  if (/EUR/.test(priceBasis)) return 'EUR'
  return null
}

/** "£73.72" / "$5.61" in the captured currency, or a plain number when the
 *  capture doesn't name one. Two decimals, thousands separators. */
export function formatMoney(value, priceBasis = null) {
  const currency = currencyOf(priceBasis)
  return value.toLocaleString('en-US', {
    style: currency ? 'currency' : 'decimal',
    ...(currency && { currency }),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/** UTC-stable "21 Sep 2026" — the capture date must not drift by timezone. */
export function formatCaptureDate(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'unknown date'
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

/**
 * The per-item price used for the "lowest price per item" sort: the computed
 * per-unit figure when the supplier provides one, otherwise the base price.
 * Null prices sort last (Infinity) — a missing price is never "free".
 */
export function effectiveUnitPrice(p) {
  return p.priceUnit ?? p.basePrice
}

/** Price → basis line: "£73.72 per 1000 bags, ex. VAT (…)" or "Ask the supplier". */
export function formatPriceLine(basePrice, priceBasis) {
  if (basePrice === null) return 'Ask the supplier'
  return priceBasis ? `${formatMoney(basePrice, priceBasis)} ${priceBasis}` : formatMoney(basePrice)
}

/** The per-unit figure shown next to the basis, e.g. "≈ $0.47 per unit". */
export function formatPerUnit(priceUnit, priceBasis = null) {
  if (priceUnit === null) return null
  return `≈ ${formatMoney(priceUnit, priceBasis)} per unit`
}

/** "1 piece" / "500 units" — MOQ line, or "Ask the supplier" when null. */
export function formatMoq(moq, moqUnit) {
  if (moq === null) return 'Ask the supplier'
  const unit = moqUnit ?? 'units'
  return `${moq.toLocaleString('en-US')} ${unit}`
}

/** "14 days" / "Ask the supplier" for lead time. */
export function formatLeadTime(leadTimeDays) {
  if (leadTimeDays === null) return 'Ask the supplier'
  return `${leadTimeDays} day${leadTimeDays === 1 ? '' : 's'}`
}

/** Quantity-break range label: "1–249" / "1,000+" for an open top tier. */
export function formatBreakRange(minQty, maxQty) {
  const min = minQty.toLocaleString('en-US')
  if (maxQty === null) return `${min}+`
  return `${min}–${maxQty.toLocaleString('en-US')}`
}

/** Badge label for the price type; null for EXACT (no badge needed). */
export function priceTypeLabel(priceType) {
  switch (priceType) {
    case 'EXACT':
      return 'Exact price'
    case 'FROM':
      return 'From price'
    case 'CALCULATOR':
      return 'Calculator quote'
    case 'QUOTE_ONLY':
      return 'Quote only'
    default:
      return priceType
  }
}

/** Human tier names for supplier status badges. */
export function supplierStatusLabel(status) {
  switch (status) {
    case 'RECOMMENDED':
      return 'Recommended'
    case 'LISTED':
      return 'Listed'
    case 'QUOTE_ONLY':
      return 'Quote only'
    case 'PENDING':
      return 'Pending verification'
    case 'DISABLED':
      return 'Disabled'
    default:
      return status
  }
}
