// Flat inline SVG product illustrations for marketplace listings.
// Drawn with the app's design tokens (hsl vars) — no external image URLs.
// Variants: jar-round, jar-squat, jar-mason, lid-top, cap-side,
//           pouch-spout, pouch-standup, label-wrap, label-sleeve

const glass = 'hsl(220 20% 88%)'
const glassEdge = 'hsl(220 14% 74%)'
const sauce = 'hsl(24 94% 50%)'
const sauceDark = 'hsl(20 88% 42%)'
const navy = 'hsl(225 16% 11%)'
const paper = 'hsl(0 0% 100%)'

function JarBase({ bodyX, bodyY, bodyW, bodyH, lidW, children }) {
  const lidX = bodyX + (bodyW - lidW) / 2
  return (
    <>
      {/* glass body */}
      <rect x={bodyX} y={bodyY} width={bodyW} height={bodyH} rx={bodyW / 5} fill={glass} stroke={glassEdge} strokeWidth="1.5" />
      {/* sauce fill */}
      <rect x={bodyX + 4} y={bodyY + bodyH * 0.14} width={bodyW - 8} height={bodyH - bodyH * 0.14 - 8} rx={(bodyW - 8) / 5} fill={sauce} />
      <rect x={bodyX + 4} y={bodyY + bodyH * 0.14} width={bodyW - 8} height={4} rx={2} fill={sauceDark} opacity="0.55" />
      {/* glass highlight */}
      <rect x={bodyX + 7} y={bodyY + 10} width="4" height={bodyH - 20} rx="2" fill={paper} opacity="0.5" />
      {/* lid */}
      <rect x={lidX} y={bodyY - 9} width={lidW} height="12" rx="3.5" fill={navy} />
      {children}
    </>
  )
}

function LabelBand({ x, w, y, h = 20 }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="3" fill={paper} stroke={glassEdge} strokeWidth="1" />
      <rect x={x + 5} y={y + 4.5} width={w * 0.42} height="3.5" rx="1.75" fill={sauce} />
      <rect x={x + 5} y={y + 11.5} width={w * 0.6} height="2" rx="1" fill={glassEdge} />
    </g>
  )
}

function JarRound() {
  return (
    <svg viewBox="0 0 120 96" role="img" aria-label="Round glass sauce jar illustration">
      <JarBase bodyX={38} bodyY={26} bodyW={44} bodyH={58} lidW={38}>
        <LabelBand x={43} y={44} w={34} />
      </JarBase>
    </svg>
  )
}

function JarSquat() {
  return (
    <svg viewBox="0 0 120 96" role="img" aria-label="Squat glass sauce jar illustration">
      <JarBase bodyX={28} bodyY={38} bodyW={64} bodyH={46} lidW={52}>
        <LabelBand x={34} y={52} w={52} />
      </JarBase>
    </svg>
  )
}

function JarMason() {
  return (
    <svg viewBox="0 0 120 96" role="img" aria-label="Mason jar illustration">
      <JarBase bodyX={40} bodyY={20} bodyW={40} bodyH={66} lidW={44} />
      {/* embossed ribs */}
      {[34, 44, 54].map((y) => (
        <line key={y} x1="44" y1={y} x2="76" y2={y} stroke={glassEdge} strokeWidth="1.5" opacity="0.7" />
      ))}
      <LabelBand x={45} y={60} w={30} h={18} />
    </svg>
  )
}

function LidTop() {
  return (
    <svg viewBox="0 0 120 96" role="img" aria-label="Twist-on lid top view illustration">
      <ellipse cx="60" cy="50" rx="34" ry="30" fill={navy} />
      <ellipse cx="60" cy="47" rx="34" ry="30" fill="hsl(225 16% 18%)" />
      {/* safety-button plug */}
      <ellipse cx="60" cy="47" rx="12" ry="10.5" fill="hsl(220 14% 88%)" opacity="0.9" />
      <ellipse cx="60" cy="47" rx="12" ry="10.5" fill="none" stroke={glassEdge} strokeWidth="1" />
      {/* grip panels */}
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i * Math.PI) / 4
        return (
          <rect
            key={i}
            x={60 + Math.cos(a) * 24 - 3.5}
            y={47 + Math.sin(a) * 21 - 3.5}
            width="7"
            height="7"
            rx="2"
            fill={navy}
            transform={`rotate(${(i * 45) + 22} ${60 + Math.cos(a) * 24} ${47 + Math.sin(a) * 21})`}
          />
        )
      })}
      <ellipse cx="60" cy="47" rx="34" ry="30" fill="none" stroke={navy} strokeWidth="2" />
    </svg>
  )
}

function CapSide() {
  return (
    <svg viewBox="0 0 120 96" role="img" aria-label="Deep-profile twist cap illustration">
      {/* cap */}
      <rect x="38" y="30" width="44" height="24" rx="5" fill={navy} />
      <rect x="38" y="30" width="44" height="7" rx="3.5" fill="hsl(225 16% 18%)" />
      {/* skirt threads */}
      <rect x="41" y="54" width="38" height="7" rx="2.5" fill={navy} opacity="0.85" />
      {/* jar neck beneath */}
      <rect x="46" y="61" width="28" height="18" rx="4" fill={glass} stroke={glassEdge} strokeWidth="1.5" />
      <rect x="46" y="66" width="28" height="13" rx="4" fill={sauce} />
      {/* button plug highlight */}
      <ellipse cx="60" cy="40" rx="8" ry="5" fill={glass} opacity="0.35" />
    </svg>
  )
}

function PouchSpout() {
  return (
    <svg viewBox="0 0 120 96" role="img" aria-label="Spouted sauce pouch illustration">
      <path d="M38 34 C36 28 40 24 46 25 L74 25 C80 24 84 28 82 34 L86 74 C86 82 78 87 60 87 C42 87 34 82 34 74 Z" fill={glass} stroke={glassEdge} strokeWidth="1.5" />
      {/* sauce window */}
      <path d="M42 40 L78 40 L81 72 C80 79 72 82 60 82 C48 82 40 79 39 72 Z" fill={sauce} />
      <rect x="42" y="40" width="36" height="4" fill={sauceDark} opacity="0.5" />
      {/* spout + cap */}
      <rect x="53" y="12" width="14" height="10" rx="3" fill={navy} />
      <ellipse cx="60" cy="12" rx="9" ry="3.5" fill="hsl(225 16% 18%)" />
      {/* sheen */}
      <path d="M44 44 L47 76" stroke={paper} strokeWidth="3" opacity="0.4" strokeLinecap="round" />
    </svg>
  )
}

function PouchStandup() {
  return (
    <svg viewBox="0 0 120 96" role="img" aria-label="Stand-up pouch illustration">
      <path d="M40 22 L80 22 L84 80 C74 86 46 86 36 80 Z" fill={glass} stroke={glassEdge} strokeWidth="1.5" />
      {/* zipper seal */}
      <rect x="42" y="28" width="36" height="3" rx="1.5" fill={glassEdge} />
      {/* label + window */}
      <rect x="48" y="38" width="24" height="28" rx="3" fill={sauce} />
      <rect x="48" y="38" width="24" height="6" rx="3" fill={sauceDark} opacity="0.5" />
      <rect x="52" y="52" width="16" height="2.5" rx="1.25" fill={paper} opacity="0.85" />
      <rect x="52" y="58" width="11" height="2.5" rx="1.25" fill={paper} opacity="0.6" />
      <path d="M44 34 L46 78" stroke={paper} strokeWidth="3" opacity="0.4" strokeLinecap="round" />
    </svg>
  )
}

function LabelWrap() {
  return (
    <svg viewBox="0 0 120 96" role="img" aria-label="Die-cut label roll illustration">
      {/* roll */}
      <circle cx="47" cy="48" r="26" fill={paper} stroke={glassEdge} strokeWidth="1.5" />
      <circle cx="47" cy="48" r="9" fill={glass} stroke={glassEdge} strokeWidth="1" />
      {/* peel-off edge of die-cut labels */}
      <path d="M47 22 A26 26 0 0 1 47 74" fill="none" stroke={glassEdge} strokeWidth="1.5" strokeDasharray="4 5" />
      {/* applied wrap label ghost */}
      <path d="M78 34 C92 32 98 38 96 44 L92 66 C90 72 82 74 74 72 L76 52 Z" fill={paper} stroke={glassEdge} strokeWidth="1.2" />
      <rect x="80" y="44" width="14" height="4" rx="2" fill={sauce} />
      <rect x="80" y="51" width="10" height="2.5" rx="1.25" fill={glassEdge} />
      <rect x="80" y="57" width="12" height="2.5" rx="1.25" fill={glassEdge} />
    </svg>
  )
}

function LabelSleeve() {
  return (
    <svg viewBox="0 0 120 96" role="img" aria-label="Shrink sleeve illustration">
      {/* sleeve over a jar silhouette */}
      <path d="M46 14 L74 14 L74 26 C82 34 82 44 80 52 L78 74 C78 80 70 84 60 84 C50 84 42 80 42 74 L40 52 C38 44 38 34 46 26 Z" fill={glass} stroke={glassEdge} strokeWidth="1.5" />
      {/* printed 360 coverage */}
      <path d="M41.6 40 L78.4 40 L79.6 54 L40.4 54 Z" fill={sauce} opacity="0.92" />
      <path d="M40.9 47 L79.1 47" stroke={sauceDark} strokeWidth="1.5" opacity="0.6" />
      <rect x="50" y="60" width="20" height="8" rx="2" fill={paper} opacity="0.9" />
      <rect x="53" y="63" width="14" height="2" rx="1" fill={sauce} />
      <ellipse cx="60" cy="17" rx="11" ry="4" fill="hsl(225 16% 18%)" />
    </svg>
  )
}

const VARIANTS = {
  'jar-round': JarRound,
  'jar-squat': JarSquat,
  'jar-mason': JarMason,
  'lid-top': LidTop,
  'cap-side': CapSide,
  'pouch-spout': PouchSpout,
  'pouch-standup': PouchStandup,
  'label-wrap': LabelWrap,
  'label-sleeve': LabelSleeve,
}

export default function ProductArt({ variant }) {
  const Art = VARIANTS[variant] ?? JarRound
  return <Art />
}
