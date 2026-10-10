import { useEffect, useRef } from 'react'

export const fmtClock = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

export const LANG_LABEL = {
  en: 'EN',
  hi: 'हिन्दी',
  mr: 'मराठी',
  no: 'Norsk',
  nb: 'Norsk',
}

const BARS = 36

// Live bar waveform driven by a 0..1 level. Bars scroll left as new levels arrive.
export function Waveform({ level = 0, tone = 'brand', label, bars = BARS }) {
  const hist = useRef(Array.from({ length: bars }, () => 0.06))
  const ref = useRef(null)
  const levelRef = useRef(level)
  levelRef.current = level
  useEffect(() => {
    const id = setInterval(() => {
      hist.current.shift()
      const jitter = 0.7 + Math.random() * 0.6
      hist.current.push(Math.max(0.06, Math.min(1, levelRef.current * jitter)))
      const el = ref.current
      if (!el) return
      const kids = el.children
      for (let i = 0; i < kids.length; i++) kids[i].style.transform = `scaleY(${hist.current[i]})`
    }, 70)
    return () => clearInterval(id)
  }, [])
  return (
    <div className={`wave wave--${tone}`}>
      {label && <span className="wave__label">{label}</span>}
      <div className="wave__bars" ref={ref} aria-hidden="true">
        {hist.current.map((v, i) => (
          <i key={i} style={{ transform: `scaleY(${v})` }} />
        ))}
      </div>
    </div>
  )
}

export function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

// snake_case row (postgres_changes) → camelCase like the API
export function camel(row) {
  if (!row) return row
  const out = {}
  for (const [k, v] of Object.entries(row)) out[k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] = v
  return out
}

// Aeko mascot — transparent cut-out that breathes when idle, bounces with the
// voice level while speaking, and tilts while listening.
import mascotUrl from '../../assets/aeko-mascot.webp'

export function AekoMascot({ level = 0, listening = false, size = 120, className = '' }) {
  const speaking = level > 0.04
  const s = speaking ? 1 + Math.min(level, 1) * 0.07 : 1
  return (
    <span
      className={`aeko-m ${speaking ? 'is-speaking' : ''} ${listening && !speaking ? 'is-listening' : ''} ${className}`}
      style={{ width: size, height: size, '--aeko-s': s }}
      aria-label="Aeko"
      role="img"
    >
      <span className="aeko-m__glow" aria-hidden="true" />
      <img src={mascotUrl} alt="" draggable="false" />
    </span>
  )
}
