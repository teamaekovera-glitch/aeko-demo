import { useState } from 'react'
import { Link } from 'react-router-dom'
import ListingCard from '../components/marketplace/ListingCard.jsx'
import FlowModal from '../components/marketplace/FlowModal.jsx'
import { PackageIcon } from '../components/icons.jsx'
import { SearchIcon } from '../components/marketplace/flow-icons.jsx'
import { BRAND_CONTEXT } from '../data/outreach.js'
import {
  CATEGORIES,
  packagingListings,
  partnerListings,
  communityListings,
  categoryLabel,
} from '../data/packaging.js'

function BrandContextStrip() {
  const packaging = BRAND_CONTEXT.rows.find((r) => r.label === 'Packaging')?.value
  return (
    <div className="mkt-strip" role="status">
      <span className="dot dot--success" />
      <span>
        Sourcing as: <strong>{BRAND_CONTEXT.client}</strong> · {packaging}
      </span>
      <span className="badge-brand">
        <PackageIcon size={11} /> Brief attached
      </span>
    </div>
  )
}

function FilterBar({ category, onCategory, search, onSearch }) {
  const counts = Object.fromEntries(
    CATEGORIES.map((c) => [
      c.id,
      c.id === 'all'
        ? partnerListings.length + communityListings.length
        : partnerListings.concat(communityListings).filter((l) => l.category === c.id).length,
    ])
  )
  return (
    <div className="mkt-filters">
      <div className="brief-bar mkt-search">
        <SearchIcon size={18} className="brief-bar__spark" />
        <input
          className="brief-bar__input"
          aria-label="Search packaging"
          placeholder="Search packaging — e.g. 63mm CT jar, spouted pouch…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>
      <div className="mkt-chips" role="listbox" aria-label="Filter by packaging type">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            role="option"
            aria-selected={category === c.id}
            className={`chip ${category === c.id ? 'chip--accent' : ''}`}
            onClick={() => onCategory(c.id)}
          >
            {c.label}
            <span className="mkt-chip__count">{counts[c.id]}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function EmptyState({ search, category, onReset }) {
  return (
    <div className="mkt-empty">
      <span className="placeholder__icon">
        <SearchIcon size={22} />
      </span>
      <p className="mkt-empty__title">
        No {category === 'all' ? '' : categoryLabel(category).toLowerCase()} listings match{' '}
        <em className="serif-accent">“{search}”</em>
      </p>
      <p className="mkt-empty__sub">Try a shorter search — e.g. “jar”, “63mm”, or “pouch” — or clear the filters.</p>
      <button type="button" className="btn btn--ghost" onClick={onReset}>
        Clear search &amp; filters
      </button>
    </div>
  )
}

export default function Marketplace() {
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [detailId, setDetailId] = useState(null)
  const [flow, setFlow] = useState(null) // { listing, type }
  const [activities, setActivities] = useState({})

  const text = search.trim().toLowerCase()
  const matches = (l) =>
    (category === 'all' || l.category === category) &&
    (!text || `${l.name} ${l.supplier}`.toLowerCase().includes(text))

  const partnerVisible = partnerListings.filter(matches)
  const communityVisible = communityListings.filter(matches)
  const totalVisible = partnerVisible.length + communityVisible.length

  const recordActivity = (listingId, entry) => {
    setActivities((prev) => ({
      ...prev,
      [listingId]: [...(prev[listingId] ?? []), entry],
    }))
  }

  const resetFilters = () => {
    setSearch('')
    setCategory('all')
  }

  const renderGrid = (listings) => (
    <div className="mkt-grid">
      {listings.map((l) => (
        <ListingCard
          key={l.id}
          listing={l}
          activities={activities[l.id] ?? []}
          detailOpen={detailId === l.id}
          onToggleDetail={() => setDetailId(detailId === l.id ? null : l.id)}
          onOpenFlow={(type) => setFlow({ listing: l, type })}
        />
      ))}
    </div>
  )

  return (
    <section className="marketplace">
      <div className="marketplace__texture bg-grid mask-radial" aria-hidden="true" />
      <div className="marketplace__inner">
        <BrandContextStrip />

        <div className="mkt-head">
          <div>
            <p className="eyebrow">
              <span className="eyebrow__dash" /> Packaging Marketplace
            </p>
            <h1 className="mkt-head__title">
              Everything your sauce run needs,{' '}
              <em className="serif-accent">one catalog.</em>
            </h1>
            <p className="mkt-head__note">
              {totalVisible} of {packagingListings.length} listings ·{' '}
              <strong>Aekovera Partner listings pinned first</strong> — community listings below are
              unvetted and price higher for a reason.
            </p>
          </div>
        </div>

        <FilterBar category={category} onCategory={setCategory} search={search} onSearch={setSearch} />

        {totalVisible === 0 ? (
          <EmptyState search={search.trim()} category={category} onReset={resetFilters} />
        ) : (
          <>
            {partnerVisible.length > 0 && (
              <section className="mkt-section" aria-label="Aekovera Partner listings">
                <p className="eyebrow eyebrow--brand">
                  <span className="eyebrow__dash" /> Aekovera Partner · Recommended — pinned first
                </p>
                {renderGrid(partnerVisible)}
              </section>
            )}

            {communityVisible.length > 0 && (
              <section className="mkt-section" aria-label="Community listings">
                <p className="eyebrow">
                  <span className="eyebrow__dash" /> Community listings · Not vetted · priced higher
                </p>
                {renderGrid(communityVisible)}
              </section>
            )}
          </>
        )}

        <p className="mkt-endnote">Simulated demo · products, prices, orders, and reviews are fictional</p>
        <Link to="/" className="btn btn--ghost mkt-back">
          Back to discovery
        </Link>
      </div>

      {flow && (
        <FlowModal
          key={`${flow.listing.id}:${flow.type}`}
          listing={flow.listing}
          flowType={flow.type}
          onClose={() => setFlow(null)}
          onRecord={recordActivity}
        />
      )}
    </section>
  )
}
