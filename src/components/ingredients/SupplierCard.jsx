/**
 * Supplier result card for the discovery grid — the marketplace catalog
 * card's facts and price-signal semantics in the aeko-demo card vocabulary.
 * Every field renders through SourceLink / SourceCitation or the Unknown
 * label; ingredient chips are capped with an honest "+N more" that points
 * to the full profile.
 */

import { Link } from 'react-router-dom'
import { bandMoq } from '../../lib/ingredients/search.js'
import {
  CertificationList,
  ChipList,
  FactField,
  PriceSignalRow,
  ProvenanceBadge,
  SourcedText,
} from './Catalog.jsx'

const INGREDIENT_CHIP_CAP = 8

export default function SupplierCard({ supplier }) {
  const ingredients = supplier.ingredients
  const rest = ingredients.value.length - INGREDIENT_CHIP_CAP
  const moqBand = bandMoq(supplier.moq?.value ?? null)

  return (
    <article className="card supplier-result">
      <header className="supplier-result__head">
        <div className="supplier-result__id">
          <h3 className="supplier-result__name">
            <a
              href={supplier.name.source.url}
              target="_blank"
              rel="noopener noreferrer"
              title={`Source: ${supplier.name.source.url} · retrieved ${supplier.name.source.retrievedAt}`}
            >
              {supplier.name.value}
            </a>
          </h3>
          <p className="supplier-result__country" data-fact-field="country">
            <MapPinGlyph /> <SourcedText sourced={supplier.country} />
          </p>
        </div>
        <Link to={`/ingredients/${supplier.id}`} className="btn btn--ghost btn--sm">
          View profile
        </Link>
      </header>

      <ProvenanceBadge supplier={supplier} />

      <section className="supplier-result__prices" data-slot="price-signals">
        <h4>Price signals · dated snapshots</h4>
        <ul>
          {supplier.priceSignals.map((signal, index) => (
            <PriceSignalRow key={index} signal={signal} index={index} />
          ))}
        </ul>
      </section>

      <dl className="fact-grid">
        <FactField label="MOQ band">
          {moqBand === 'unspecified' ? <span className="moq-plain">Unspecified</span> : moqBand}
        </FactField>
        <FactField label="Sample policy">
          <SourcedText sourced={supplier.samplePolicy} />
        </FactField>
        <FactField label="Ingredients" wide>
          <ChipList sourced={ingredients} cap={INGREDIENT_CHIP_CAP} />
        </FactField>
        <FactField label="Categories" wide>
          <ChipList sourced={supplier.categories} />
        </FactField>
      </dl>
      {rest > 0 && (
        <p className="supplier-result__more-note">
          {ingredients.value.length} ingredients total — all listed on the full profile.
        </p>
      )}

      <section className="supplier-result__certs" data-slot="certifications">
        <h4>Certifications</h4>
        <CertificationList supplier={supplier} />
      </section>

      <footer className="supplier-result__foot">
        <Link to={`/ingredients/${supplier.id}`} className="supplier-result__profile-link">
          View full profile →
        </Link>
      </footer>
    </article>
  )
}

function MapPinGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}
