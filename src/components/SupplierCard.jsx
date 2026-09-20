import StarRating from './StarRating.jsx'
import Monogram from './Monogram.jsx'
import { ArrowRightIcon, MapPinIcon, ShieldCheckIcon } from './icons.jsx'

export default function SupplierCard({ supplier, onIntroduce }) {
  const { name, type, location, partner, match, rating, reviews, moq, capacity, response } = supplier

  return (
    <article className={`card supplier-card ${partner ? 'supplier-card--partner' : ''}`}>
      <div className="supplier-card__head">
        <Monogram name={name} />
        <div className="supplier-card__id">
          <h3 className="supplier-card__name">{name}</h3>
          <p className="supplier-card__type">{type}</p>
          <p className="supplier-card__location">
            <MapPinIcon size={13} /> {location}
          </p>
        </div>
        {partner && (
          <span className="badge-partner">
            <ShieldCheckIcon size={13} />
            Aekovera Partner · Recommended
          </span>
        )}
      </div>

      <div className="supplier-card__meta">
        <StarRating rating={rating} reviews={reviews} />
        <span className="match" title={`${match}% match for your brief`}>
          <span className="match__label">{match}% match</span>
          <span className="match__bar">
            <span className="match__bar-fill" style={{ width: `${match}%` }} />
          </span>
        </span>
      </div>

      <div className="supplier-card__tags">
        {supplier.capabilities.map((c) => (
          <span key={c} className="tag">
            {c}
          </span>
        ))}
      </div>

      <div className="supplier-card__tags">
        {supplier.certifications.map((c) => (
          <span key={c} className="tag tag--cert">
            {c}
          </span>
        ))}
      </div>

      <dl className="supplier-card__specs">
        <div>
          <dt>MOQ</dt>
          <dd>{moq}</dd>
        </div>
        <div>
          <dt>Capacity</dt>
          <dd>{capacity}</dd>
        </div>
      </dl>

      <div className="supplier-card__quotes">
        {supplier.quotes.map((q, i) => (
          <blockquote key={i} className="quote">
            <p>“{q.text}”</p>
            <footer>— {q.author}</footer>
          </blockquote>
        ))}
      </div>

      {response && (
        <p className="supplier-card__response">
          <span className="dot dot--success" /> {response}
        </p>
      )}

      {onIntroduce && (
        <div className="supplier-card__actions">
          <button type="button" className="btn btn--brand btn--pill" onClick={onIntroduce}>
            Introduce me
            <ArrowRightIcon size={15} className="btn__arrow" />
          </button>
        </div>
      )}
    </article>
  )
}
