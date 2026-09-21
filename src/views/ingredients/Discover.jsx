/**
 * /ingredients — the discovery system: instant client-side search over the
 * real build-time index. Semantics ported from the marketplace's
 * SupplierDiscovery + SearchResults + filters and unchanged: OR within a
 * facet group, AND across groups; dataset-level facet counts; deterministic
 * ranking; 48-result cap; explained empty state.
 *
 * Layout (v2): persistent left filter sidebar (sticky on desktop, drawer
 * behind a Filters button on mobile), labeled collapsible facet sections
 * with per-option counts, and an active-filters pill row above the results.
 * Deep links carry ?q= plus one param per facet group (?regions=…&category=
 * style keys below); the legacy ?region= param still seeds regions.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { catalogSuppliers, regionCounts, withheldCount } from '../../lib/ingredients/catalog.js'
import {
  buildCatalogIndex,
  buildCatalogRecords,
  searchCatalogIndex,
} from '../../lib/ingredients/search.js'
import { RESULTS_CAP, priceTierLabel } from '../../lib/ingredients/display.js'
import SupplierCard from '../../components/ingredients/SupplierCard.jsx'
import { ChevronDownIcon, SearchIcon, XIcon } from '../../components/icons.jsx'

/** Facet groups in the ported order; price tiers render their B1 labels. */
const FACET_GROUPS = [
  { field: 'regions', label: 'Region', facet: 'region' },
  { field: 'categories', label: 'Category', facet: 'category' },
  { field: 'subtypes', label: 'Subtype', facet: 'subtype' },
  { field: 'forms', label: 'Form', facet: 'form' },
  { field: 'certifications', label: 'Certification', facet: 'certification' },
  { field: 'moqBands', label: 'MOQ band', facet: 'moqBand' },
  { field: 'priceTiers', label: 'Price signal', facet: 'priceTiers', tierLabels: true },
]

/** Groups expanded on a fresh visit; active groups always auto-expand. */
const DEFAULT_OPEN_GROUPS = new Set(['regions', 'categories'])

/** Groups whose option list scrolls internally instead of stretching. */
const SCROLL_GROUP_SIZE = 12

function selectedFromParams(params) {
  const next = {}
  for (const { field } of FACET_GROUPS) {
    // Canonical plural key; regions also honors the legacy ?region= seed.
    const raw = params.get(field) ?? (field === 'regions' ? params.get('region') : null)
    if (!raw) continue
    const set = new Set(raw.split(',').filter(Boolean))
    if (set.size > 0) next[field] = set
  }
  return next
}

function FacetSection({ group, options, active, open, onToggleGroup, onToggleValue }) {
  if (options.length === 0) return null
  const scrolls = options.length > SCROLL_GROUP_SIZE
  return (
    <div className="facet-sec">
      <button
        type="button"
        className="facet-sec__head"
        aria-expanded={open}
        aria-controls={`facet-sec-${group.field}`}
        onClick={onToggleGroup}
      >
        <span className="facet-sec__label">{group.label}</span>
        <span className="facet-sec__meta">
          {active.size > 0 && (
            <span className="facet-sec__badge" aria-label={`${active.size} selected`}>
              {active.size}
            </span>
          )}
          <ChevronDownIcon size={16} className="facet-sec__chev" />
        </span>
      </button>
      {open && (
        <ul
          className={`facet-opts${scrolls ? ' facet-opts--long' : ''}`}
          id={`facet-sec-${group.field}`}
        >
          {options.map((option) => {
            const label = group.tierLabels ? priceTierLabel(option.value) : option.value
            const isSelected = active.has(option.value)
            return (
              <li key={option.value} className="facet-opt">
                <label className={`facet-opt__row${isSelected ? ' facet-opt__row--on' : ''}`}>
                  <input
                    type="checkbox"
                    className="facet-opt__input"
                    checked={isSelected}
                    onChange={() => onToggleValue(option.value)}
                  />
                  <span className="facet-opt__box" aria-hidden="true" />
                  <span className="facet-opt__label" title={label}>
                    {label}
                  </span>
                  <span className="facet-opt__count">{option.count.toLocaleString('en-US')}</span>
                </label>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default function Discover() {
  const [searchParams, setSearchParams] = useSearchParams()

  const [query, setQuery] = useState(() => searchParams.get('q') ?? '')
  const [selected, setSelected] = useState(() => selectedFromParams(searchParams))
  const [openGroups, setOpenGroups] = useState(() => {
    const initial = new Set(DEFAULT_OPEN_GROUPS)
    for (const { field } of FACET_GROUPS) {
      if (selected[field]?.size > 0) initial.add(field)
    }
    return initial
  })
  const [drawerOpen, setDrawerOpen] = useState(false)

  const drawerButtonRef = useRef(null)
  const drawerPanelRef = useRef(null)

  const client = useMemo(
    () =>
      buildCatalogIndex(
        buildCatalogRecords({
          suppliers: [...catalogSuppliers],
          regionCounts: [...regionCounts],
          totalCount: catalogSuppliers.length,
        }),
        regionCounts,
      ),
    [],
  )

  // Facet selection → ported filter shape (tiers stored as ids).
  const filters = useMemo(
    () => ({
      regions: [...(selected.regions ?? [])],
      categories: [...(selected.categories ?? [])],
      subtypes: [...(selected.subtypes ?? [])],
      forms: [...(selected.forms ?? [])],
      certifications: [...(selected.certifications ?? [])],
      moqBands: [...(selected.moqBands ?? [])],
      priceTiers: [...(selected.priceTiers ?? [])],
    }),
    [selected],
  )

  // Local index resolves synchronously; same call shape as the search client.
  const response = useMemo(
    () => searchCatalogIndex(client, query, filters),
    [client, query, filters],
  )

  const suppliersById = useMemo(() => new Map(catalogSuppliers.map((s) => [s.id, s])), [])

  // Keep the URL in step with query + every facet group so deep links stay
  // shareable (canonical plural keys; legacy ?region= is still read on load).
  useEffect(() => {
    const next = new URLSearchParams()
    if (query.trim()) next.set('q', query.trim())
    for (const { field } of FACET_GROUPS) {
      const values = [...(selected[field] ?? [])]
      if (values.length > 0) next.set(field, values.join(','))
    }
    setSearchParams(next, { replace: true })
  }, [query, selected, setSearchParams])

  // Mobile drawer: lock body scroll and close on Escape while open.
  useEffect(() => {
    if (!drawerOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event) => {
      if (event.key === 'Escape') setDrawerOpen(false)
    }
    window.addEventListener('keydown', onKey)
    drawerPanelRef.current?.focus()
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [drawerOpen])

  const openDrawer = () => {
    setDrawerOpen(true)
  }
  const closeDrawer = () => {
    setDrawerOpen(false)
    drawerButtonRef.current?.focus()
  }

  const toggleFacet = (groupKey, value) =>
    setSelected((prev) => {
      const set = new Set(prev[groupKey] ?? [])
      if (set.has(value)) {
        set.delete(value)
      } else {
        set.add(value)
      }
      return { ...prev, [groupKey]: set }
    })

  const toggleGroupOpen = (groupKey) =>
    setOpenGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupKey)) {
        next.delete(groupKey)
      } else {
        next.add(groupKey)
      }
      return next
    })

  const clearFilters = () => setSelected({})
  const clearAll = () => {
    setQuery('')
    setSelected({})
  }

  const hasActiveFacets = Object.values(selected).some((set) => set.size > 0)
  const activeFacetCount = Object.values(selected).reduce((sum, set) => sum + set.size, 0)

  // One pill per active filter value; removal is one click.
  const activePills = FACET_GROUPS.flatMap((group) =>
    [...(selected[group.field] ?? [])].map((value) => ({
      field: group.field,
      group: group.label,
      value,
      display: group.tierLabels ? priceTierLabel(value) : value,
    })),
  )

  const items = response.hits.flatMap((hit) => {
    const supplier = suppliersById.get(hit.record.supplierId)
    return supplier ? [{ supplier }] : []
  })

  const shown = items.slice(0, RESULTS_CAP)
  const truncated = response.totalHits > shown.length

  const facetSections = (
    <>
      {FACET_GROUPS.map((group) => {
        const options = response.facetCounts[group.facet] ?? []
        return (
          <FacetSection
            key={group.field}
            group={group}
            options={options}
            active={selected[group.field] ?? new Set()}
            open={openGroups.has(group.field) || (selected[group.field]?.size ?? 0) > 0}
            onToggleGroup={() => toggleGroupOpen(group.field)}
            onToggleValue={(value) => toggleFacet(group.field, value)}
          />
        )
      })}
    </>
  )

  const pillRow = activePills.length > 0 && (
    <div className="disc-pills" data-active-filters role="group" aria-label="Active filters">
      {activePills.map((pill) => (
        <span key={`${pill.field}:${pill.value}`} className="disc-pill">
          <span className="disc-pill__group">{pill.group}</span>
          <span className="disc-pill__value">{pill.display}</span>
          <button
            type="button"
            className="disc-pill__x"
            aria-label={`Remove filter ${pill.group}: ${pill.display}`}
            onClick={() => toggleFacet(pill.field, pill.value)}
          >
            <XIcon size={12} />
          </button>
        </span>
      ))}
      <button type="button" className="disc-clear" onClick={clearFilters}>
        Clear all
      </button>
    </div>
  )

  const sidebar = (
    <div
      ref={drawerPanelRef}
      className={`disc-sidebar${drawerOpen ? ' disc-sidebar--open' : ''}`}
      tabIndex={-1}
      aria-label="Filter suppliers"
    >
      <div className="disc-sidebar__head">
        <p className="disc-sidebar__title">
          Filters
          {activeFacetCount > 0 && (
            <span className="facet-sec__badge" aria-label={`${activeFacetCount} active`}>
              {activeFacetCount}
            </span>
          )}
        </p>
        <div className="disc-sidebar__head-actions">
          {hasActiveFacets && (
            <button type="button" className="disc-clear" onClick={clearFilters}>
              Clear all
            </button>
          )}
          <button
            type="button"
            className="disc-sidebar__close"
            aria-label="Close filters"
            onClick={closeDrawer}
          >
            <XIcon size={16} />
          </button>
        </div>
      </div>
      <p className="disc-sidebar__hint">
        Match any within a group, all across groups. Counts show suppliers per option for the
        current search.
      </p>
      <div className="disc-sidebar__sections">{facetSections}</div>
    </div>
  )

  return (
    <section className="marketplace disc">
      <div className="marketplace__texture bg-grid mask-radial" aria-hidden="true" />
      <div className="marketplace__inner">
        <div className="mkt-head">
          <div>
            <p className="eyebrow">
              <span className="eyebrow__dash" /> Ingredients · Supplier catalog
            </p>
            <h1 className="mkt-head__title">
              Find the source,
              <em className="serif-accent"> not just a supplier.</em>
            </h1>
            <p className="mkt-head__note">
              {catalogSuppliers.length.toLocaleString('en-US')} listed suppliers ·{' '}
              <strong>every fact links to the page it was read from</strong> — with the date it was
              read. Anything without a source stays Unknown.
            </p>
          </div>
        </div>

        {drawerOpen && (
          <button
            type="button"
            className="disc-overlay"
            aria-label="Close filters"
            onClick={closeDrawer}
          />
        )}

        <div className="disc-shell">
          {sidebar}

          <div className="disc-main">
            <div className="disc-toolbar">
              <div className="brief-bar mkt-search">
                <SearchIcon size={18} className="brief-bar__spark" />
                <input
                  className="brief-bar__input"
                  aria-label="Search ingredient suppliers"
                  placeholder="Search — e.g. coconut, vitamin C, GMP…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {(query || hasActiveFacets) && (
                  <button type="button" className="btn btn--ghost btn--sm" onClick={clearAll}>
                    Clear
                  </button>
                )}
              </div>
              <button
                ref={drawerButtonRef}
                type="button"
                className="btn btn--navy btn--pill disc-filters-toggle"
                aria-expanded={drawerOpen}
                aria-haspopup="dialog"
                onClick={openDrawer}
              >
                Filters{activeFacetCount > 0 ? ` · ${activeFacetCount}` : ''}
              </button>
            </div>

            {pillRow}

            {response.totalHits === 0 ? (
              <div className="mkt-empty" data-slot="search-empty">
                <span className="placeholder__icon">
                  <SearchIcon size={22} />
                </span>
                <p className="mkt-empty__title">
                  {query.trim() ? (
                    <>
                      No supplier matches <em className="serif-accent">“{query.trim()}”</em>
                    </>
                  ) : (
                    'No supplier passes the selected filters.'
                  )}
                </p>
                <p className="mkt-empty__sub">
                  {query.trim() ? (
                    <>
                      No indexed field — name, ingredient, category, or certification — matches.
                      Results require at least one matching term.
                    </>
                  ) : (
                    'Every search field is sourced; nothing is inferred to fill a result set.'
                  )}
                </p>
                <button type="button" className="btn btn--ghost" onClick={clearAll}>
                  Clear search &amp; filters
                </button>
              </div>
            ) : (
              <>
                <p className="results-count" data-result-count role="status">
                  {response.totalHits.toLocaleString('en-US')}{' '}
                  {response.totalHits === 1 ? 'supplier' : 'suppliers'}
                  {query.trim() ? (
                    <>
                      {' '}
                      for <em className="serif-accent">“{query.trim()}”</em>
                    </>
                  ) : null}
                  {' · '}
                  <span className="results-count__rank">
                    ranked by coverage of your terms — what the row is outweighs where it is
                  </span>
                </p>

                <div className="ing-grid" data-result-list>
                  {shown.map(({ supplier }) => (
                    <SupplierCard key={supplier.id} supplier={supplier} />
                  ))}
                </div>

                {truncated ? (
                  <p className="truncated-note" data-truncated-note>
                    Showing the first {shown.length} of{' '}
                    {response.totalHits.toLocaleString('en-US')} results — refine your search or
                    filters to narrow the set. Nothing is hidden by ranking; the count above is the
                    full matched set.
                  </p>
                ) : null}
              </>
            )}

            <p className="mkt-endnote">
              Region counts reflect the full research corpus. {withheldCount} rows are withheld
              pending verification and are not searchable.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
