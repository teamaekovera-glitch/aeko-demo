/**
 * Featured rail selection for the packaging landing page.
 *
 * Ported 1:1 from aekobaba_new src/lib/catalog/featured.ts: verified
 * suppliers first (RECOMMENDED above LISTED, unverified tiers last), then
 * better-reviewed; categories interleave one product per round so the rail
 * shows catalog breadth. Pure function — no clock, no randomness.
 */

const STATUS_RANK = {
  RECOMMENDED: 0,
  LISTED: 1,
  QUOTE_ONLY: 2,
  PENDING: 3,
  DISABLED: 4,
}

/** Rail size for the packaging landing featured section (FEATURED_PRODUCT_CAP). */
export const FEATURED_PRODUCT_CAP = 10

/**
 * Pick the featured products: verified-first ordering, spread across
 * categories, capped. Deterministic — ties break on review count, then id —
 * so the rail is stable across renders and runs.
 */
export function selectFeaturedProducts(products, cap = FEATURED_PRODUCT_CAP) {
  const ranked = [...products].sort((a, b) => {
    const byStatus = STATUS_RANK[a.supplier.status] - STATUS_RANK[b.supplier.status]
    if (byStatus !== 0) return byStatus
    const byScore = (b.supplier.reviewScore ?? -1) - (a.supplier.reviewScore ?? -1)
    if (byScore !== 0) return byScore
    if (a.supplier.reviewCount !== b.supplier.reviewCount) {
      return b.supplier.reviewCount - a.supplier.reviewCount
    }
    return a.id.localeCompare(b.id)
  })

  // Group by category, preserving ranked order within each group. Map
  // insertion order keeps groups in best-rank-first order for interleaving.
  const groups = new Map()
  for (const product of ranked) {
    const group = groups.get(product.categorySlug) ?? []
    group.push(product)
    groups.set(product.categorySlug, group)
  }

  const featured = []
  while (featured.length < cap) {
    let picked = false
    for (const group of groups.values()) {
      if (featured.length >= cap) break
      const next = group.shift()
      if (next) {
        featured.push(next)
        picked = true
      }
    }
    if (!picked) break
  }
  return featured
}
