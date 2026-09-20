// ---------------------------------------------------------------------------
// Cold open — a scripted, non-interactive cinematic intro that plays before
// the live call. Four beats over ~60s: war room → data funnel → the blast →
// hook, then an automatic handoff into the existing incoming-call UI at
// /outreach/live. Pure DOM/CSS/canvas animation; no audio, no network, no
// keys, no call-engine changes — the handoff is a plain navigation.
//
// All copy, figures, and names come from the pinned config in
// src/data/coldOpen.js (fictional demo data).
// ---------------------------------------------------------------------------
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import {
  CheckCircleIcon,
  ClipboardListIcon,
  FastForwardIcon,
  FileTextIcon,
  MailIcon,
  MessageCircleIcon,
  PhoneIcon,
  SparklesIcon,
} from '../icons.jsx'
import {
  COLD_OPEN,
  contactChannel,
  contactName,
  fmtInt,
  mulberry32,
  waypointValue,
} from '../../data/coldOpen.js'
import './coldopen.css'

const FLAG = 'aekoColdOpenPlayed'
const BEAT_ORDER = ['warRoom', 'funnel', 'blast', 'hook']

const clamp01 = (p) => Math.min(Math.max(p, 0), 1)
const easeOut = (p) => 1 - Math.pow(1 - clamp01(p), 3)

function beatIndexAt(t) {
  let idx = 0
  BEAT_ORDER.forEach((b, i) => {
    if (COLD_OPEN.beats[b].start <= t) idx = i
  })
  return idx
}

// Local beat clock — seconds since mount, sampled at ~fps. Time-based, so a
// backgrounded tab catches up (counters clamp, beats advance) instead of
// freezing or stacking timers.
function useElapsed(fps = 14) {
  const [t, setT] = useState(0)
  useEffect(() => {
    let raf = 0
    let last = 0
    const t0 = performance.now()
    const tick = (now) => {
      const e = (now - t0) / 1000
      if (now - last >= 1000 / fps) {
        last = now
        setT(e)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [fps])
  return t
}

function CountUp({ to, dur, delay = 0, className }) {
  const t = useElapsed(14)
  return <span className={className}>{fmtInt(to * easeOut((t - delay) / dur))}</span>
}

const CHANNEL_ICONS = {
  Email: MailIcon,
  Chat: MessageCircleIcon,
  Voice: PhoneIcon,
  Forms: ClipboardListIcon,
  Quotes: FileTextIcon,
  Intro: SparklesIcon,
}

// ---------------------------------------------------------------------------
// Beat 1 — WAR ROOM: three agent fleets, live ticks, partner fan-out.
// ---------------------------------------------------------------------------

function FleetTicker({ seed }) {
  const names = useMemo(() => {
    const r = mulberry32(seed)
    const p = ['Harvest Row', 'Blue Pine', 'Cedar & Crumb', 'Foxglove', 'Copperline', 'Driftwood']
    const list = []
    for (let i = 0; i < 9; i++) {
      const logi = r() < 0.35
      list.push(logi ? ['Atlas Cold Chain', 'Meridian Freight', 'Cobalt Cartage', 'Keystone Coldchain'][i % 4] : `${p[i % p.length]} ${['Foods', 'Baking Co.', 'Provisions', 'Bottling Co.'][i % 4]}`)
    }
    return list
  }, [seed])
  const row = [...names, ...names]
  return (
    <div className="cold-ticker" aria-hidden="true">
      <div className="cold-ticker__row">
        {row.map((n, i) => (
          <span key={i} className="cold-ticker__item">
            {n}
          </span>
        ))}
      </div>
    </div>
  )
}

function WarRoom() {
  const fleets = COLD_OPEN.fleets
  return (
    <div className="cold-beat cold-war">
      <header className="cold-head">
        <p className="cold-microlabel">
          <span className="cold-microlabel__dash" /> Aekovera war room · live
        </p>
        <h2 className="cold-title">
          Three fleets. <em>One network.</em>
        </h2>
        <p className="cold-sub">Manufacturers and logistics partners, engaged in parallel.</p>
      </header>
      <div className="cold-war__grid">
        {fleets.map((f, fi) => (
          <article key={f.code} className="cold-fleet" style={{ '--d': `${0.25 + fi * 0.3}s` }}>
            <div className="cold-fleet__top">
              <span className="cold-fleet__code">{f.code}</span>
              <span className="cold-fleet__product">{f.product}</span>
            </div>
            <div className="cold-fleet__stats">
              <div className="cold-fleet__stat">
                <strong>
                  <CountUp to={f.mfrs + f.logistics} dur={5.5} delay={0.4} />
                </strong>
                <span>partners engaged</span>
              </div>
              <div className="cold-fleet__stat">
                <strong>
                  <CountUp to={f.tickTo} dur={8} delay={0.8} />
                </strong>
                <span>{f.tickLabel}</span>
              </div>
            </div>
            <div className="cold-fleet__bar">
              <i style={{ '--dur': '8.5s' }} />
            </div>
            <p className="cold-fleet__status">
              <span className="cold-livedot" /> {f.status}
            </p>
            <FleetTicker seed={101 + fi} />
          </article>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Beat 2 — DATA FUNNEL: canvas dot field streaming through scoring gates,
// collapsing into the 10×10 top-100 grid. DOM overlay carries the counters.
// ---------------------------------------------------------------------------

// Field sample: pure function of the pinned seed — same animation every run.
function buildDots() {
  const cfg = COLD_OPEN.funnel
  const r = mulberry32(20260919)
  const dots = []
  for (let i = 0; i < cfg.dots; i++) {
    const fails = cfg.gates.map((g) => r() < g.kill)
    dots.push({
      fx: r(), // horizontal position, fraction of width
      y0: r(), // phase within the wrap cycle
      v: 0.055 + r() * 0.04, // field heights per second
      size: 1.6 + r() * 1.3,
      fails,
      q: r(), // grid qualification score
    })
  }
  // Exactly the top cfg.contacted survivors become the grid.
  const gridIdx = dots
    .map((d, i) => i)
    .filter((i) => !dots[i].fails.some(Boolean))
    .sort((a, b) => dots[a].q - dots[b].q)
    .slice(0, cfg.contacted)
  gridIdx.forEach((i, slot) => {
    dots[i].isGrid = true
    dots[i].slot = slot
  })
  return dots
}

// First time (s) after `at` when dot crosses gate line at yFrac.
function gateCrossTime(dot, gateIdx, yFrac, fieldH, at) {
  const P = fieldH / (dot.v * fieldH) // wrap period in s = 1/v
  const first = (((yFrac * fieldH - dot.y0 * fieldH) % fieldH) + fieldH) % fieldH / (dot.v * fieldH)
  const n = Math.max(0, Math.ceil((at - first) / P))
  return first + n * P
}

function FunnelCanvas() {
  const ref = useRef(null)
  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext?.('2d')
    if (!canvas || !ctx) return
    const cfg = COLD_OPEN.funnel
    const dots = buildDots()
    const gateY = [0.3, 0.46, 0.62, 0.78] // fractions of height, per gate
    const deathAt = dots.map((d) => {
      let death = Infinity
      d.fails.forEach((f, g) => {
        if (!f) return
        const t = gateCrossTime(d, g, gateY[g], 1, cfg.gates[g].at)
        if (t < death) death = t
      })
      return death
    })

    let W = 0
    let H = 0
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      W = canvas.clientWidth
      H = canvas.clientHeight
      canvas.width = Math.round(W * dpr)
      canvas.height = Math.round(H * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const halfWidth = (y) => W * 0.44 * (1 - 0.82 * Math.pow(y / H, 1.15))
    const slotFor = (slot) => {
      const g = cfg.grid
      const cell = 16
      const cx = W / 2
      const cy = H * 0.58
      return [cx + ((slot % g) - (g - 1) / 2) * cell, cy + (Math.floor(slot / g) - (g - 1) / 2) * cell]
    }

    let raf = 0
    const t0 = performance.now()
    const draw = (now) => {
      const t = (now - t0) / 1000
      const fieldH = H * 0.9
      const tEff = Math.min(t, cfg.collapseAt)
      const cx = W / 2
      ctx.clearRect(0, 0, W, H)

      // funnel walls
      ctx.strokeStyle = 'rgba(255,255,255,0.09)'
      ctx.lineWidth = 1
      for (const side of [-1, 1]) {
        ctx.beginPath()
        ctx.moveTo(cx + side * halfWidth(0), 0)
        for (const gy of gateY) ctx.lineTo(cx + side * halfWidth(gy * H), gy * H)
        ctx.lineTo(cx + side * halfWidth(fieldH), fieldH)
        ctx.stroke()
      }

      // gates + labels
      cfg.gates.forEach((g, gi) => {
        const y = gateY[gi] * H
        const passed = t >= g.at
        const hw = halfWidth(y)
        ctx.strokeStyle = passed ? 'rgba(247,104,8,0.55)' : 'rgba(255,255,255,0.10)'
        ctx.beginPath()
        ctx.moveTo(cx - hw, y)
        ctx.lineTo(cx + hw, y)
        ctx.stroke()
        ctx.font = '600 10px "Geist Mono Variable", ui-monospace, monospace'
        ctx.fillStyle = passed ? 'rgba(247,104,8,0.9)' : 'rgba(255,255,255,0.35)'
        ctx.fillText(`${g.label.toUpperCase()}  ·  ${fmtInt(g.pass)}`, cx + hw + 10, y + 3)
      })

      // dots
      for (let i = 0; i < dots.length; i++) {
        const d = dots[i]
        const cycle = (d.y0 + d.v * tEff) % 1
        const y = cycle * fieldH
        let x = cx + (d.fx - 0.5) * 2 * halfWidth(y)
        let alpha = 1
        let color = d.isGrid ? 'rgba(247,104,8,0.95)' : 'rgba(196,206,232,0.5)'
        let size = d.size

        const death = deathAt[i]
        if (death !== Infinity && t >= death && t < cfg.collapseAt) {
          const dt = t - death
          alpha = 1 - dt / 1.1
          if (alpha <= 0) continue
          x += Math.sign(d.fx - 0.5 || 1) * dt * 26
          color = 'rgba(140,148,168,0.55)'
        } else if (t >= cfg.collapseAt) {
          if (d.isGrid) {
            const p = easeOut((t - cfg.collapseAt) / 2.4)
            const [gx, gy] = slotFor(d.slot)
            x += (gx - x) * p
            const yFlow = y
            const yTarget = gy
            const yy = yFlow + (yTarget - yFlow) * p
            ctx.save()
            ctx.shadowColor = 'rgba(247,104,8,0.8)'
            ctx.shadowBlur = 6 * p
            ctx.fillStyle = color
            ctx.globalAlpha = alpha
            ctx.fillRect(x - size / 2, yy - size / 2, size, size)
            ctx.restore()
            continue
          }
          alpha = 1 - (t - cfg.collapseAt) / 1.6
          if (alpha <= 0) continue
        }

        ctx.globalAlpha = alpha
        ctx.fillStyle = color
        ctx.fillRect(x - size / 2, y - size / 2, size, size)
      }
      ctx.globalAlpha = 1

      // top-100 grid frame once formed
      if (t >= cfg.collapseAt + 2.2) {
        const [gx0, gy0] = slotFor(0)
        const [gx1, gy1] = slotFor(cfg.contacted - 1)
        ctx.strokeStyle = 'rgba(247,104,8,0.35)'
        ctx.strokeRect(gx0 - 14, gy0 - 14, gx1 - gx0 + 28, gy1 - gy0 + 28)
      }

      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])
  return <canvas ref={ref} className="cold-funnel__canvas" aria-hidden="true" />
}

function FunnelBeat() {
  const cfg = COLD_OPEN.funnel
  const t = useElapsed(14)
  const counter = waypointValue(t, [
    [0, cfg.scanned],
    ...cfg.gates.map((g) => [g.at, g.pass]),
    [cfg.collapseAt, cfg.qualified],
    [cfg.collapseAt + 2.4, cfg.contacted],
  ])
  const label =
    t < cfg.gates[0].at
      ? 'suppliers scanned'
      : t >= cfg.collapseAt + 2.4
        ? 'contacted — top of the network'
        : 'qualified through screens'
  return (
    <div className="cold-beat cold-funnel">
      <FunnelCanvas />
      <header className="cold-head cold-head--overlay">
        <p className="cold-microlabel">
          <span className="cold-microlabel__dash" /> Global supplier funnel
        </p>
        <h2 className="cold-title">
          Every supplier. Scored. <em>Collapsed to the hundred that matter.</em>
        </h2>
      </header>
      <div className="cold-funnel__counter">
        <strong>{fmtInt(counter)}</strong>
        <span>{label}</span>
      </div>
      <div className="cold-funnel__gates">
        {cfg.gates.map((g) => (
          <span key={g.label} className={`cold-gate${t >= g.at ? ' is-passed' : ''}`}>
            {g.label} · {fmtInt(g.pass)}
          </span>
        ))}
        <span className={`cold-gate cold-gate--final${t >= cfg.collapseAt + 2.4 ? ' is-passed' : ''}`}>
          Contacted · {fmtInt(cfg.contacted)}
        </span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Beat 3 — THE BLAST: 100 outreach cards across the workspace channels, with
// paperwork auto-drafting on the rail. Visual language mirrors /outreach.
// ---------------------------------------------------------------------------

// Deterministic reply set — exactly COLD_OPEN.blast.replies cards get answers.
const REPLY_SET = (() => {
  const r = mulberry32(424242)
  const set = new Set()
  while (set.size < COLD_OPEN.blast.replies) set.add(Math.floor(r() * COLD_OPEN.blast.contacts))
  return set
})()

function BlastBeat() {
  const b = COLD_OPEN.blast
  return (
    <div className="cold-beat cold-blast">
      <header className="cold-head">
        <p className="cold-microlabel">
          <span className="cold-microlabel__dash" /> Outreach blast
        </p>
        <h2 className="cold-title">
          A hundred conversations. <em>One pass.</em>
        </h2>
        <p className="cold-sub">
          {b.contacts} suppliers · {b.channels.length} channels · paperwork drafted and sent by the agent.
        </p>
      </header>
      <div className="cold-blast__body">
        <div className="cold-blast__grid" aria-hidden="true">
          {Array.from({ length: b.contacts }, (_, i) => {
            const ChannelIcon = CHANNEL_ICONS[contactChannel(i)]
            return (
              <div
                key={i}
                className={`cold-card${REPLY_SET.has(i) ? ' is-reply' : ''}`}
                style={{ '--fire': `${i * 0.045}s`, '--reply': `${4 + i * 0.13}s` }}
              >
                <span className="cold-card__ch">
                  <ChannelIcon size={9} />
                </span>
                <span className="cold-card__name">{contactName(i)}</span>
                <span className="cold-card__dot" />
              </div>
            )
          })}
        </div>
        <aside className="cold-blast__rail">
          <p className="cold-microlabel cold-microlabel--soft">Paperwork · auto-drafted</p>
          {b.docs.map((d) => (
            <div key={d.kind} className="cold-doc" style={{ '--at': `${d.at}s` }}>
              <div className="cold-doc__top">
                <FileTextIcon size={13} />
                <strong>{d.kind}</strong>
                <span className="cold-doc__stamp">
                  <CheckCircleIcon size={11} /> sent
                </span>
              </div>
              <div className="cold-doc__lines" aria-hidden="true">
                <i />
                <i />
                <i />
              </div>
              <span className="cold-doc__count">{d.count} out</span>
            </div>
          ))}
        </aside>
      </div>
      <p className="cold-blast__settle">
        {b.contacts} sent · {b.replies} replies · {b.docs.reduce((n, d) => n + d.count, 0)} documents out — zero touched by hand.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Beat 4 — HOOK: the order, then the call. Handoff happens at handoffAt.
// ---------------------------------------------------------------------------

function HookBeat() {
  const h = COLD_OPEN.hook
  return (
    <div className="cold-beat cold-hook">
      <div className="cold-hook__order">
        <p className="cold-microlabel cold-microlabel--center">
          <span className="cold-microlabel__dash" /> {h.eyebrow} <span className="cold-microlabel__dash" />
        </p>
        <h2 className="cold-hook__lines">
          {h.orderLines.map((line, i) => (
            <span key={line} className={i === 2 ? 'is-urgent' : ''}>
              {line}
            </span>
          ))}
        </h2>
        <p className="cold-hook__note">{h.note}</p>
      </div>
      <div className="cold-hook__call" aria-hidden="true">
        <div className="cold-hook__rings">
          <span />
          <span />
          <span />
          <div className="cold-hook__badge">P</div>
        </div>
        <p className="cold-microlabel cold-microlabel--center">{h.callEyebrow}</p>
        <h2 className="cold-hook__callline">{h.callLine}</h2>
        <p className="cold-hook__callsub">{h.callSub}</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Orchestrator + session gate
// ---------------------------------------------------------------------------

function beatEl(i) {
  switch (BEAT_ORDER[i]) {
    case 'warRoom':
      return <WarRoom />
    case 'funnel':
      return <FunnelBeat />
    case 'blast':
      return <BlastBeat />
    default:
      return <HookBeat />
  }
}

export default function ColdOpen() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = useMemo(() => {
    const n = params.get('next')
    return n && n.startsWith('/') && !n.startsWith('//') ? n : COLD_OPEN.defaultNext
  }, [params])

  const t = useElapsed(12)
  const [leaving, setLeaving] = useState(null)
  const prevRef = useRef(0)
  const beatIdx = beatIndexAt(t)

  // Crossfade handoff between beats — same pattern as the workspace screens.
  useEffect(() => {
    if (prevRef.current === beatIdx) return
    setLeaving(prevRef.current)
    prevRef.current = beatIdx
    const id = window.setTimeout(() => setLeaving(null), 620)
    return () => window.clearTimeout(id)
  }, [beatIdx])

  const leave = useCallback(() => {
    try {
      sessionStorage.setItem(FLAG, '1')
    } catch {
      /* private mode — skip persistence, still navigate */
    }
    navigate(next, { replace: true })
  }, [navigate, next])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') leave()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [leave])

  // Automatic handoff into the live incoming-call UI.
  useEffect(() => {
    if (t >= COLD_OPEN.handoffAt) leave()
  }, [t, leave])

  const progress = clamp01(t / COLD_OPEN.total)

  return (
    <section className="cold" aria-label="Aekovera demo — cold open">
      <div className="cold__texture" aria-hidden="true" />
      {leaving != null && (
        <div className="cold__layer cold__layer--leaving" aria-hidden="true">
          {beatEl(leaving)}
        </div>
      )}
      <div className="cold__layer">{beatEl(beatIdx)}</div>

      <div className="cold__top">
        <span className="cold__brand">Æ Aekovera</span>
        <button type="button" className="cold__skip" onClick={leave}>
          Skip intro <FastForwardIcon size={13} />
        </button>
      </div>
      <div className="cold__progress" aria-hidden="true">
        <i style={{ width: `${progress * 100}%` }} />
      </div>
    </section>
  )
}

// Renders the live call only after the cold open has played (or been skipped)
// this session; otherwise swaps in the intro once. No call-engine changes.
export function ColdOpenGate({ children }) {
  let played = false
  try {
    played = sessionStorage.getItem(FLAG) === '1'
  } catch {
    played = false
  }
  if (!played) return <Navigate to={`/intro?next=${encodeURIComponent('/outreach/live')}`} replace />
  return children
}
