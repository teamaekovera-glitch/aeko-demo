/**
 * /packaging/results — filtered catalog view.
 *
 * Ported from aekobaba_new src/app/results + lib/catalog/filters.ts: the URL
 * is the single source of truth (parseFilters is forgiving of junk params),
 * facets update with the query (each dimension counts within the others
 * open), sorting is one of the four spec sorts, and the search note states
 * honestly what the taxonomy matched — no invented results. An unmatched
 * query (resolved === null) shows suggestions instead of presenting the
 * whole catalog as matches; picking another facet keeps the narrowed view.
 */

import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  SORTS,
  SORT_LABELS,
  MOQ_BUCKETS,
  LEAD_BUCKETS,
  applyFilters,
  buildResultsUrl,
  computeFacets,
  hasAnyLeadTimeData,
  parseFilters,
  sortProducts,
} from '../../lib/packaging/filters'
import { resolveSearchQuery } from '../../lib/packaging/aliases'
import { allProducts } from '../../lib/packaging/catalog'
import { POPULAR_SEARCHES, popularSearchUrl } from '../../lib/packaging/popular'
import { priceTypeLabel } from '../../lib/packaging/format'
import ProductCard from '../../components/packaging/ProductCard'
import { PackageIcon } from '../../components/icons.jsx'

/** One labelled facet group: single-select toggle options with live counts. */
function FacetGroup({ label, options, activeValue, onPick }) {
  return (
    <div className="pkg-facet">
      <div className="pkg-facet__label">{label}</div>
      <ul className="pkg-facet__opts">
        {options.map((opt) => {
          const on = activeValue !== null && String(activeValue) === String(opt.value)
          return (
            <li key={opt.value}>
              <button
                type="button"
                className={`pkg-facet__opt ${on ? 'pkg-facet__opt--on' : ''}`}
                aria-pressed={on}
                onClick={() => onPick(on ? null : opt.value)}
              >
                <span>{opt.label}</span>
                <span className="pkg-facet__count">{opt.count}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** Removable pill per active filter dimension. */
function ActivePills({ filters, categoryName, remove }) {
  const pills = []
  if (filters.q) pills.push({ group: 'Search', value: filters.q, patch: { q: null } })
  if (filters.category)
    pills.push({ group: 'Category', value: categoryName ?? filters.category, patch: { category: null } })
  if (filters.material)
    pills.push({ group: 'Material', value: filters.material, patch: { material: null } })
  if (filters.stockOrCustom)
    pills.push({
      group: 'Sourcing',
      value: filters.stockOrCustom === 'STOCK' ? 'Stock' : 'Custom',
      patch: { stockOrCustom: null },
    })
  if (filters.priceType)
    pills.push({
      group: 'Pricing',
      value: priceTypeLabel(filters.priceType),
      patch: { priceType: null },
    })
  if (filters.location)
    pills.push({ group: 'Location', value: filters.location, patch: { location: null } })
  if (filters.cert) pills.push({ group: 'Certification', value: filters.cert, patch: { cert: null } })
  if (filters.maxMoq !== null) {
    const bucket = MOQ_BUCKETS.find((b) => b.value === filters.maxMoq)
    pills.push({ group: 'MOQ', value: bucket ? bucket.label : `Up to ${filters.maxMoq}`, patch: { maxMoq: null } })
  }
  if (filters.maxLeadDays !== null) {
    const bucket = LEAD_BUCKETS.find((b) => b.value === filters.maxLeadDays)
    pills.push({ group: 'Lead time', value: bucket ? bucket.label : `Up to ${filters.maxLeadDays} days`, patch: { maxLeadDays: null } })
  }

  if (pills.length === 0) return null
  return (
    <div className="pkg-pills" role="list" aria-label="Active filters">
      {pills.map((pill) => (
        <span key={`${pill.group}:${pill.value}`} className="pkg-pill" role="listitem">
          <span className="pkg-pill__group">{pill.group}</span>
          <span className="pkg-pill__value">{pill.value}</span>
          <button
            type="button"
            className="pkg-pill__x"
            aria-label={`Remove ${pill.group} filter`}
            onClick={() => remove(pill.patch)}
          >
            ×
          </button>
        </span>
      ))}
    </div>
  )
}

export default function PackagingResults() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [queryDraft, setQueryDraft] = useState(searchParams.get('q') ?? '')

  const filters = useMemo(() => parseFilters(searchParams), [searchParams])
  const resolved = useMemo(
    () => (filters.q ? resolveSearchQuery(filters.q) : null),
    [filters.q],
  )
  const results = useMemo(
    () => sortProducts(applyFilters(allProducts, filters, resolved), filters.sort),
    [filters, resolved],
  )
  const facets = useMemo(() => computeFacets(allProducts, filters, resolved), [filters, resolved])
  const leadDataExists = useMemo(() => hasAnyLeadTimeData(allProducts), [])
  const categoryRow = useMemo(
    () => (filters.category ? allProducts.find((p) => p.categorySlug === filters.category) : null),
    [filters.category],
  )

  // Keep the draft in sync when navigation (popular chips, header search) changes q.
  useEffect(() => {
    setQueryDraft(searchParams.get('q') ?? '')
  }, [searchParams])

  const update = (patch) => navigate(buildResultsUrl(filters, patch))

  const submitSearch = (e) => {
    e.preventDefault()
    update({ q: queryDraft.trim() || null })
  }

  const clearAll = () => {
    setQueryDraft('')
    navigate('/packaging/results')
  }

  const activeCount =
    (filters.q ? 1 : 0) +
    (filters.category ? 1 : 0) +
    (filters.material ? 1 : 0) +
    (filters.stockOrCustom ? 1 : 0) +
    (filters.priceType ? 1 : 0) +
    (filters.location ? 1 : 0) +
    (filters.cert ? 1 : 0) +
    (filters.maxMoq !== null ? 1 : 0) +
    (filters.maxLeadDays !== null ? 1 : 0)

  // Unmatched free text must not read as "here are 80 matching products": with
  // no other facet active, swap the grid for suggestions. A user-picked facet
  // (activeCount > 1) keeps the narrowed, honestly-labelled result list.
  const showNoMatchSuggestions =
    Boolean(filters.q) && resolved === null && activeCount === 1

  return (
    <section className="marketplace pkg-page">
      <div className="marketplace__texture bg-grid mask-radial" aria-hidden="true" />
      <div className="pkg-page__inner">
        <nav className="pkg-crumbs" aria-label="Breadcrumb">
          <Link to="/packaging">Packaging</Link>
          <span aria-hidden="true">/</span>
          <span>Results</span>
        </nav>

        <div className="pkg-shell">
          <aside className="pkg-sidebar" aria-label="Filters">
            <div className="pkg-sidebar__head">
              <h2 className="pkg-sidebar__title">
                <PackageIcon size={15} /> Filters
              </h2>
              {activeCount > 0 && (
                <button type="button" className="pkg-clear" onClick={clearAll}>
                  Clear all
                </button>
              )}
            </div>
            <p className="pkg-facet__note">
              Counts update with your other filters. Options come from the captured dataset —
              nothing is estimated.
            </p>

            <FacetGroup
              label="Category"
              options={facets.category}
              activeValue={filters.category}
              onPick={(v) => update({ category: v })}
            />
            <FacetGroup
              label="Material"
              options={facets.material}
              activeValue={filters.material}
              onPick={(v) => update({ material: v })}
            />
            <FacetGroup
              label="Sourcing"
              options={facets.stockCustom}
              activeValue={filters.stockOrCustom}
              onPick={(v) => update({ stockOrCustom: v })}
            />
            <FacetGroup
              label="Pricing"
              options={facets.priceType}
              activeValue={filters.priceType}
              onPick={(v) => update({ priceType: v })}
            />
            <FacetGroup
              label="Location"
              options={facets.location}
              activeValue={filters.location}
              onPick={(v) => update({ location: v })}
            />
            <FacetGroup
              label="Minimum order"
              options={facets.minOrder}
              activeValue={filters.maxMoq !== null ? String(filters.maxMoq) : null}
              onPick={(v) => update({ maxMoq: v === null ? null : Number(v) })}
            />

            {leadDataExists ? (
              <FacetGroup
                label="Lead time"
                options={facets.leadTime}
                activeValue={filters.maxLeadDays !== null ? String(filters.maxLeadDays) : null}
                onPick={(v) => update({ maxLeadDays: v === null ? null : Number(v) })}
              />
            ) : (
              <p className="pkg-facet__note">
                Lead times aren&apos;t published by these suppliers, so there is no lead-time
                filter — ask the supplier with each quote.
              </p>
            )}

            <FacetGroup
              label="Certifications"
              options={facets.certifications}
              activeValue={filters.cert}
              onPick={(v) => update({ cert: v })}
            />
          </aside>

          <div className="pkg-main">
            <div className="pkg-toolbar">
              <form className="brief-bar mkt-search" onSubmit={submitSearch}>
                <input
                  className="brief-bar__input"
                  aria-label="Search packaging"
                  placeholder="What are you packaging?"
                  value={queryDraft}
                  onChange={(e) => setQueryDraft(e.target.value)}
                />
              </form>
              <label className="pkg-sorts">
                Sort
                <select
                  value={filters.sort}
                  onChange={(e) => update({ sort: e.target.value })}
                  aria-label="Sort results"
                >
                  {SORTS.map((s) => (
                    <option key={s} value={s}>
                      {SORT_LABELS[s]}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {filters.q && (
              <p className="pkg-query-note">
                {resolved ? (
                  <>
                    Interpreted <strong>“{filters.q}”</strong> as{' '}
                    <strong>{resolved.categorySlugs.join(', ')}</strong>
                    {resolved.matchedTerms.length > 0 && (
                      <> — covering {resolved.matchedTerms.join(', ')}</>
                    )}
                    .
                  </>
                ) : showNoMatchSuggestions ? (
                  <>
                    No taxonomy match for <strong>“{filters.q}”</strong> — no results are shown
                    rather than a guess. Try a popular search below.
                  </>
                ) : (
                  <>
                    No taxonomy match for <strong>“{filters.q}”</strong> — showing everything,
                    narrowed by the filters below.
                  </>
                )}
              </p>
            )}

            <ActivePills
              filters={filters}
              categoryName={categoryRow ? categoryRow.categoryName : null}
              remove={update}
            />

            {!showNoMatchSuggestions && (
              <p className="pkg-count">
                <strong>{results.length}</strong> product{results.length === 1 ? '' : 's'}
                {activeCount > 0 ? ` of ${allProducts.length}` : ''} · every price and MOQ is a
                dated snapshot from the supplier&apos;s own page
              </p>
            )}

            {showNoMatchSuggestions ? (
              <div className="pkg-empty">
                <p className="pkg-empty__title">No taxonomy match for “{filters.q}”</p>
                <p className="pkg-empty__sub">
                  The taxonomy did not match this wording, so no products are shown rather than a
                  guess. Try one of the popular searches, or browse the categories.
                </p>
                <div className="pkg-popular">
                  <span>Popular:</span>
                  {POPULAR_SEARCHES.map((entry) => (
                    <Link key={entry.label} className="chip" to={popularSearchUrl(entry)}>
                      {entry.label}
                    </Link>
                  ))}
                </div>
                <Link className="btn btn--brand" to="/packaging">
                  Browse all packaging categories
                </Link>
              </div>
            ) : results.length === 0 ? (
              <div className="pkg-empty">
                <p className="pkg-empty__title">No products match those filters</p>
                <p className="pkg-empty__sub">
                  The snapshot has {allProducts.length} products across {facets.category.length}{' '}
                  categories in scope. Loosen a filter or clear everything to browse the full
                  range.
                </p>
                <button type="button" className="btn btn--brand" onClick={clearAll}>
                  Clear all filters
                </button>
              </div>
            ) : (
              <div className="pkg-grid">
                {results.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
