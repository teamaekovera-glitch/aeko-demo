/**
 * /ingredients/:supplierId — the full profile: identity, regions served,
 * categories, ingredients, every price signal (verbatim string + source URL +
 * access date + tier + flag where present), certification chips marked
 * company-stated, MOQ and sample policy where present, note + confidence —
 * and a complete evidence section where every line deep-links to its source.
 * Semantics ported from the marketplace's SupplierProfile + profileClaims;
 * unknown stays Unknown (Rulebook D4).
 */

import { useEffect } from 'react'
import { Link, useParams, useLocation } from 'react-router-dom'
import { suppliersById } from '../../lib/ingredients/catalog.js'
import { bandMoq } from '../../lib/ingredients/search.js'
import { certificationChipLabel } from '../../lib/ingredients/display.js'
import {
  CertificationList,
  ChipList,
  FactField,
  PriceSignalRow,
  ProvenanceBadge,
  SourcedText,
  SourceCitation,
} from '../../components/ingredients/Catalog.jsx'

function ProfileSection({ title, children }) {
  return (
    <section className="card profile-section">
      <h2>{title}</h2>
      <div className="profile-section__body">{children}</div>
    </section>
  )
}

/**
 * The full claim audit trail: one entry per displayed claim, each with its
 * own source URL and retrieval date. Claims with no fetched source (null
 * fields) render the Unknown label inline and carry no entry — there is no
 * source to cite.
 */
function profileClaims(supplier) {
  const claims = [
    { label: 'Name', source: supplier.name.source },
    { label: 'Website', source: supplier.website.source },
    { label: 'Country', source: supplier.country.source },
    { label: 'Categories', source: supplier.categories.source },
    { label: 'Ingredients', source: supplier.ingredients.source },
    { label: 'Certifications', source: supplier.certifications.source },
  ]
  for (const [label, sourced] of [
    ['HQ', supplier.hq],
    ['Type', supplier.type],
    ['Regions served', supplier.regionsServed],
    ['Review presence', supplier.reviewPresence],
    ['MOQ', supplier.moq],
    ['Sample policy', supplier.samplePolicy],
    ['Capacity', supplier.capacity],
  ]) {
    if (sourced) claims.push({ label, source: sourced.source })
  }
  for (const cert of supplier.certifications.value) {
    claims.push({
      label: `Certification: ${cert.name} (${certificationChipLabel(cert.status)})`,
      source: cert.source,
    })
  }
  supplier.priceSignals.forEach((signal, index) => {
    claims.push({ label: `Price signal ${index + 1}`, source: signal.source })
  })
  return claims
}

export default function SupplierProfile() {
  const { supplierId } = useParams()
  const supplier = suppliersById.get(supplierId)
  const location = useLocation()

  // The cards' single 'View sources' affordance deep-links here with #evidence.
  useEffect(() => {
    if (location.hash !== '#evidence') return
    document.getElementById('evidence')?.scrollIntoView({ block: 'start' })
  }, [location])

  if (!supplier) {
    return (
      <section className="marketplace">
        <div className="marketplace__texture bg-grid mask-radial" aria-hidden="true" />
        <div className="marketplace__inner">
          <div className="mkt-empty">
            <span className="placeholder__icon">Æ</span>
            <p className="mkt-empty__title">
              No supplier row <em className="serif-accent">“{supplierId}”</em>
            </p>
            <p className="mkt-empty__sub">
              The catalog links only to rows that exist — this id is not in the exported catalog.
              Withheld rows are excluded pending verification and have no profile.
            </p>
            <Link to="/ingredients" className="btn btn--ghost">
              Browse the catalog
            </Link>
          </div>
        </div>
      </section>
    )
  }

  const claims = profileClaims(supplier)
  const moqBand = bandMoq(supplier.moq?.value ?? null)

  return (
    <section className="marketplace">
      <div className="marketplace__texture bg-grid mask-radial" aria-hidden="true" />
      <div className="marketplace__inner">
        <header className="profile-head">
          <Link to="/ingredients" className="profile-back">
            ← All ingredient suppliers
          </Link>
          <h1 className="profile-head__name">
            <a
              href={supplier.name.source.url}
              target="_blank"
              rel="noopener noreferrer"
              title={`Source: ${supplier.name.source.url} · retrieved ${supplier.name.source.retrievedAt}`}
            >
              {supplier.name.value}
            </a>
          </h1>
          <div className="profile-head__meta">
            <ProvenanceBadge supplier={supplier} />
            <span className="profile-head__country" data-fact-field="country">
              <SourcedText sourced={supplier.country} />
            </span>
          </div>
          {supplier.note ? (
            <p className="profile-note">
              <span>Research note:</span> {supplier.note}
            </p>
          ) : null}
        </header>

        <div className="profile-layout">
          <div className="profile-main">
            <ProfileSection title="Overview">
              <dl className="fact-grid">
                <FactField label="HQ">
                  <SourcedText sourced={supplier.hq} />
                </FactField>
                <FactField label="Type">
                  <SourcedText sourced={supplier.type} />
                </FactField>
                <FactField label="Regions served">
                  <SourcedText sourced={supplier.regionsServed} />
                </FactField>
                <FactField label="Review presence">
                  <SourcedText sourced={supplier.reviewPresence} />
                </FactField>
                <FactField label="Ingredients" wide>
                  <ChipList sourced={supplier.ingredients} />
                </FactField>
                <FactField label="Categories" wide>
                  <ChipList sourced={supplier.categories} />
                </FactField>
              </dl>
            </ProfileSection>

            <ProfileSection title="Commercial terms">
              <dl className="fact-grid">
                <FactField label="MOQ">
                  <SourcedText sourced={supplier.moq} />
                </FactField>
                <FactField label="MOQ band">
                  {moqBand === 'unspecified' ? (
                    <span className="moq-plain">Unspecified</span>
                  ) : (
                    moqBand
                  )}
                </FactField>
                <FactField label="Sample policy">
                  <SourcedText sourced={supplier.samplePolicy} />
                </FactField>
                <FactField label="Capacity">
                  <SourcedText sourced={supplier.capacity} />
                </FactField>
              </dl>
              <div className="profile-prices">
                <h4>Price signals — dated snapshots, never live quotes</h4>
                <ul>
                  {supplier.priceSignals.map((signal, index) => (
                    <PriceSignalRow key={index} signal={signal} index={index} />
                  ))}
                </ul>
              </div>
            </ProfileSection>

            <ProfileSection title="Certifications">
              <p className="profile-cert-note">
                Shown exactly as the supplier states them — registry verification is not performed
                in v1.
              </p>
              <CertificationList supplier={supplier} />
            </ProfileSection>
          </div>

          <aside className="profile-evidence">
            <div className="card profile-evidence__card" id="evidence">
              <h2>Evidence — every claim and its source</h2>
              <p className="profile-evidence__sub">
                Each line is the page the claim was read from and the date it was opened. Claimed
                facts without a fetched source render Unknown on this profile and carry no line
                here.
              </p>
              <ul className="evidence-list">
                {claims.map((claim, i) => (
                  <li key={`${claim.label}-${i}`} className="evidence-list__item">
                    <span className="evidence-list__label">{claim.label}</span>
                    <SourceCitation source={claim.source} />
                    <span className="evidence-list__date">
                      retrieved {claim.source.retrievedAt}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>

        <Link to="/ingredients" className="btn btn--ghost mkt-back">
          Back to ingredient suppliers
        </Link>
        <p className="mkt-endnote">
          Certifications are shown as the supplier states them — registry verification is not
          performed in v1. Withheld rows are excluded from this catalog pending verification.
        </p>
      </div>
    </section>
  )
}
