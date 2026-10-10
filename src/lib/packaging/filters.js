/**
 * Results filtering, faceting, and sorting.
 *
 * Ported 1:1 from aekobaba_new src/lib/catalog/filters.ts — everything here
 * is pure and synchronous over the product view models. Filter priority
 * order is the source spec's decision: minimum order → price type →
 * stock/custom → material & category → location → lead time → certifications.
 */

import { effectiveUnitPrice } from './format'
import { resolveSearchQuery } from './aliases'

export const SORTS = ['price', 'moq', 'lead', 'reviews']
export const DEFAULT_SORT = 'reviews'

/** Spec priority order for the left rail, top to bottom. */
export const FILTER_GROUP_ORDER = [
  'min-order',
  'price-type',
  'stock-custom',
  'material-category',
  'location',
  'lead-time',
  'certifications',
]

export const MOQ_BUCKETS = [
  { value: 100, label: 'Up to 100' },
  { value: 1000, label: 'Up to 1,000' },
  { value: 10000, label: 'Up to 10,000' },
]

export const LEAD_BUCKETS = [
  { value: 7, label: 'Up to 7 days' },
  { value: 14, label: 'Up to 14 days' },
  { value: 30, label: 'Up to 30 days' },
]

const PRICE_TYPES = ['EXACT', 'CALCULATOR', 'FROM', 'QUOTE_ONLY']

const PRICE_TYPE_LABELS = {
  EXACT: 'Exact price',
  CALCULATOR: 'Calculator quote',
  FROM: 'From price',
  QUOTE_ONLY: 'Quote only',
}

const STOCK_LABELS = { STOCK: 'Stock', CUSTOM: 'Custom' }

/**
 * Parse URL search params (a URLSearchParams) into typed filters. Junk
 * values are ignored, never guessed.
 */
export function parseFilters(searchParams) {
  const get = (key) => {
    const raw = searchParams.get(key)
    return raw === null ? undefined : raw
  }
  const nonNegativeInt = (raw) => {
    if (raw === undefined || raw === '') return null
    const parsed = Number(raw)
    if (!Number.isInteger(parsed) || parsed < 0) return null
    return parsed
  }
  const rawPriceType = get('priceType')
  const rawStock = get('stock')
  const rawSort = get('sort')
  return {
    q: get('q')?.trim() || null,
    maxMoq: nonNegativeInt(get('maxMoq')),
    priceType: rawPriceType !== undefined && PRICE_TYPES.includes(rawPriceType) ? rawPriceType : null,
    stockOrCustom: rawStock === 'STOCK' || rawStock === 'CUSTOM' ? rawStock : null,
    material: get('material') || null,
    category: get('category') || null,
    location: get('location') || null,
    maxLeadDays: nonNegativeInt(get('maxLead')),
    cert: get('cert') || null,
    sort: SORTS.includes(rawSort) ? rawSort : DEFAULT_SORT,
  }
}

/**
 * Serialize filters back to a shareable query string. Defaults and nulls are
 * omitted so URLs stay clean ("/packaging/results?maxMoq=1000&sort=price").
 */
export function filtersToQueryString(filters) {
  const params = new URLSearchParams()
  if (filters.q) params.set('q', filters.q)
  if (filters.maxMoq !== null) params.set('maxMoq', String(filters.maxMoq))
  if (filters.priceType) params.set('priceType', filters.priceType)
  if (filters.stockOrCustom) params.set('stock', filters.stockOrCustom)
  if (filters.material) params.set('material', filters.material)
  if (filters.category) params.set('category', filters.category)
  if (filters.location) params.set('location', filters.location)
  if (filters.maxLeadDays !== null) params.set('maxLead', String(filters.maxLeadDays))
  if (filters.cert) params.set('cert', filters.cert)
  if (filters.sort !== DEFAULT_SORT) params.set('sort', filters.sort)
  return params.toString()
}

/** Build a /packaging/results URL from a filter patch on the current state. */
export function buildResultsUrl(current, patch) {
  const next = { ...current, ...patch }
  const qs = filtersToQueryString(next)
  return qs ? `/packaging/results?${qs}` : '/packaging/results'
}

/**
 * Categories the result set is scoped to. A search query's alias resolution
 * intersects an explicit category filter — picking "Labels" inside a "coffee"
 * search narrows to labels; a category outside the query's scope yields an
 * empty (honest) result.
 */
export function effectiveCategorySlugs(filters, resolved) {
  if (filters.category) {
    if (resolved && !resolved.categorySlugs.includes(filters.category)) return []
    return [filters.category]
  }
  return resolved ? resolved.categorySlugs : null
}

/** Apply the typed filters to a product list. Pure. */
export function applyFilters(products, filters, resolved) {
  const categorySlugs = effectiveCategorySlugs(filters, resolved)
  return products.filter((p) => {
    if (categorySlugs !== null && !categorySlugs.includes(p.categorySlug)) return false
    if (filters.maxMoq !== null && (p.moq === null || p.moq > filters.maxMoq)) return false
    if (filters.priceType && p.priceType !== filters.priceType) return false
    if (filters.stockOrCustom && p.stockOrCustom !== filters.stockOrCustom) return false
    if (filters.material && p.materialFamily !== filters.material) return false
    if (filters.location && p.supplier.location !== filters.location) return false
    if (filters.maxLeadDays !== null && (p.leadTimeDays === null || p.leadTimeDays > filters.maxLeadDays)) return false
    if (filters.cert && !p.certificationNames.includes(filters.cert)) return false
    return true
  })
}

// ─── Facets ─────────────────────────────────────────────────────────────────

function countBy(products, key) {
  const counts = new Map()
  for (const p of products) {
    const k = key(p)
    if (k === null) continue
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  return counts
}

function toOptions(counts, label) {
  return [...counts.entries()]
    .map(([value, count]) => ({ value, label: label(value), count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
}

/**
 * Facet counts that update with the query: each facet counts the products
 * matching every OTHER active filter (its own dimension is left open), so
 * counts always describe what clicking the option would yield.
 */
export function computeFacets(products, filters, resolved) {
  const except = (omit) => applyFilters(products, { ...filters, [omit]: null }, resolved)

  const moqCandidates = except('maxMoq')
  const priceCandidates = except('priceType')
  const stockCandidates = except('stockOrCustom')
  const materialCandidates = except('material')
  const categoryCandidates = except('category')
  const locationCandidates = except('location')
  const leadCandidates = except('maxLeadDays')
  const certCandidates = except('cert')

  const minOrder = MOQ_BUCKETS.map((bucket) => ({
    value: String(bucket.value),
    label: bucket.label,
    count: moqCandidates.filter((p) => p.moq !== null && p.moq <= bucket.value).length,
  }))

  const priceType = toOptions(countBy(priceCandidates, (p) => p.priceType), (v) => PRICE_TYPE_LABELS[v] ?? v)

  const stockCustom = ['STOCK', 'CUSTOM']
    .map((value) => ({
      value,
      label: STOCK_LABELS[value],
      count: stockCandidates.filter((p) => p.stockOrCustom === value).length,
    }))
    .filter((o) => o.count > 0 || filters.stockOrCustom === o.value)

  const material = toOptions(countBy(materialCandidates, (p) => p.materialFamily), (v) => v)

  const categoryCounts = countBy(categoryCandidates, (p) => p.categorySlug)
  const categoryNames = new Map(categoryCandidates.map((p) => [p.categorySlug, p.categoryName]))
  const category = [...categoryCounts.entries()]
    .map(([slug, count]) => ({ value: slug, label: categoryNames.get(slug) ?? slug, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))

  const location = toOptions(countBy(locationCandidates, (p) => p.supplier.location), (v) => v)

  const leadTime = LEAD_BUCKETS.map((bucket) => ({
    value: String(bucket.value),
    label: bucket.label,
    count: leadCandidates.filter((p) => p.leadTimeDays !== null && p.leadTimeDays <= bucket.value).length,
  }))

  const certifications = toOptions(countBy(certCandidates, (p) => p.certificationNames[0] ?? null), (v) => v)

  return { minOrder, priceType, stockCustom, material, category, location, leadTime, certifications }
}

/** True when any product in scope publishes a lead time — drives the honest note. */
export function hasAnyLeadTimeData(someProducts) {
  return someProducts.some((p) => p.leadTimeDays !== null)
}

// ─── Sorting ────────────────────────────────────────────────────────────────

export const SORT_LABELS = {
  price: 'Lowest price per item',
  moq: 'Smallest minimum order',
  lead: 'Fastest lead time',
  reviews: 'Best-reviewed',
}

function ascendingWithNullsLast(value) {
  return value ?? Number.POSITIVE_INFINITY
}

function descendingWithNullsLast(value) {
  return value === null ? Number.NEGATIVE_INFINITY : value
}

/** The four spec sorts. Pure and stable. */
export function sortProducts(someProducts, sort) {
  const sorted = [...someProducts]
  switch (sort) {
    case 'price':
      sorted.sort(
        (a, b) => ascendingWithNullsLast(effectiveUnitPrice(a)) - ascendingWithNullsLast(effectiveUnitPrice(b)),
      )
      break
    case 'moq':
      sorted.sort((a, b) => ascendingWithNullsLast(a.moq) - ascendingWithNullsLast(b.moq))
      break
    case 'lead':
      sorted.sort((a, b) => ascendingWithNullsLast(a.leadTimeDays) - ascendingWithNullsLast(b.leadTimeDays))
      break
    case 'reviews':
      sorted.sort(
        (a, b) =>
          descendingWithNullsLast(b.supplier.reviewScore) - descendingWithNullsLast(a.supplier.reviewScore) ||
          b.supplier.reviewCount - a.supplier.reviewCount,
      )
      break
  }
  return sorted
}

export { resolveSearchQuery }
