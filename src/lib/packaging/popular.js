/**
 * "Popular searches" block for the packaging landing page.
 *
 * Ported 1:1 from aekobaba_new src/lib/catalog/popular.ts: curated intent
 * chips (free-text label → alias resolution → scoped results link), most
 * general first. The labels and order are the source's editorial data.
 */

import { buildResultsUrl, parseFilters } from './filters'

/** Curated landing-page searches: chip label → resolved categories/counts. */
export const POPULAR_SEARCHES = [
  { label: 'Stand-up pouches', q: 'pouches' },
  { label: 'Woozy bottles', q: 'hot sauce' },
  { label: 'Glass jars', q: 'skincare' },
  { label: 'Folding cartons', q: 'snacks' },
  { label: 'Labels', q: 'coffee' },
  { label: 'Dropper vials', q: 'serum' },
  { label: 'Metal tins', q: 'tea' },
  { label: 'Collapsible tubes', q: 'cosmetics' },
]

/** The exact results URL a chip deep-links to (deterministic). */
export function popularSearchUrl(entry) {
  return buildResultsUrl(parseFilters(new URLSearchParams()), { q: entry.q })
}
