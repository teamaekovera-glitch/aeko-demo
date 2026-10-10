// Aekobaba packaging panel shown during the brand callback: three options,
// Aeko spotlights each one as she talks, recommends Berlin Packaging direct,
// and shows the Amazon-vs-manufacturer price gap.
import { useState } from 'react'
import { PACKAGING_OPTIONS, PACKAGING_PICK } from '../../data/packagingScene.js'

function PackImage({ o }) {
  const [src, setSrc] = useState(o.remote)
  return (
    <img
      src={src}
      alt={o.name}
      loading="eager"
      onError={() => {
        if (src !== o.image) setSrc(o.image)
      }}
    />
  )
}

export default function PackagingScene({ brandCompany, focusId, quotedId }) {
  const amazon = PACKAGING_OPTIONS.find((o) => o.id === 'amazon')
  const pick = PACKAGING_OPTIONS.find((o) => o.id === PACKAGING_PICK)
  const ratio = amazon?.unitNum && pick?.unitNum ? Math.round(amazon.unitNum / pick.unitNum) : null
  const showCompare = focusId === PACKAGING_PICK || !!quotedId
  const quoted = PACKAGING_OPTIONS.find((o) => o.id === quotedId)

  return (
    <section className="pk">
      <header className="pk__bar">
        <span className="pk__logo">
          <b>Aeko</b>baba
        </span>
        <span className="pk__for">Packaging for {brandCompany || 'your brand'}</span>
        <span className="pk__search">Cookie bag · single-serve · food-safe</span>
      </header>

      <div className="pk__grid">
        {PACKAGING_OPTIONS.map((o) => {
          const focused = focusId === o.id
          const dimmed = focusId && !focused && !quotedId
          return (
            <article
              key={o.id}
              className={[
                'pk-card',
                `pk-card--${o.tone}`,
                focused ? 'is-focus' : '',
                dimmed ? 'is-dim' : '',
                quotedId === o.id ? 'is-quoted' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <div className="pk-card__img">
                <PackImage o={o} />
                <span className="pk-card__n">{o.rank}</span>
                {o.recommended && <span className="pk-card__pick">✦ Aeko picked</span>}
                {o.tone === 'reject' && focusId && <span className="pk-card__stamp">Amazon markup</span>}
              </div>
              <div className="pk-card__body">
                <strong>{o.name}</strong>
                <span className="pk-card__seller">
                  {o.seller} · {o.channel}
                </span>
                <div className="pk-card__price">
                  <b>{o.unitPrice}</b>
                  <span>{o.priceNote}</span>
                </div>
                <p className="pk-card__verdict">{o.verdict}</p>
              </div>
            </article>
          )
        })}
      </div>

      {showCompare && ratio && (
        <div className="pk-compare">
          <p className="pk-compare__title">
            Same bag quality, <b>~{ratio}× cheaper</b> direct from the manufacturer
          </p>
          <div className="pk-compare__row">
            <span>Berlin Packaging · via Aeko</span>
            <i className="pk-compare__bar is-pick" style={{ '--w': `${(pick.unitNum / amazon.unitNum) * 100}%` }} />
            <b>{pick.unitPrice}</b>
          </div>
          <div className="pk-compare__row">
            <span>Amazon retail listing</span>
            <i className="pk-compare__bar" style={{ '--w': '100%' }} />
            <b>{amazon.unitPrice}</b>
          </div>
        </div>
      )}

      {quoted && (
        <p className="pk-quoted">
          ✓ Quote request sent to {quoted.seller} — {quoted.name}
        </p>
      )}
    </section>
  )
}
