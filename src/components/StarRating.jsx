import { StarIcon } from './icons.jsx'

// Five-star row with fractional fill (amber), plus numeric rating and review count.
export default function StarRating({ rating, reviews, size = 14 }) {
  const stars = Array.from({ length: 5 }, (_, i) => {
    const fill = Math.max(0, Math.min(1, rating - i))
    return (
      <span key={i} className="star">
        <span className="star__base">
          <StarIcon size={size} />
        </span>
        <span className="star__fill" style={{ width: `${fill * 100}%` }}>
          <StarIcon size={size} filled />
        </span>
      </span>
    )
  })

  return (
    <span className="rating" aria-label={`Rated ${rating} out of 5 from ${reviews} reviews`}>
      <span className="rating__stars">{stars}</span>
      <span className="rating__value">{rating.toFixed(1)}</span>
      <span className="rating__count">({reviews} reviews)</span>
    </span>
  )
}
