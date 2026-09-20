// Shared supplier-initials chip, used by supplier cards and timeline groups.
export default function Monogram({ name, small = false }) {
  const text = name
    .split(' ')
    .filter((w) => /^[A-Z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
  return (
    <span
      className={`supplier-card__monogram ${small ? 'supplier-card__monogram--sm' : ''}`}
      aria-hidden="true"
    >
      {text}
    </span>
  )
}
