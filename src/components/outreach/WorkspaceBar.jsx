import { CHANNEL_DEFS } from './channels.js'
import { CheckCircleIcon, FastForwardIcon, RotateCcwIcon, SparklesIcon } from '../icons.jsx'

// Slim, always-visible workspace bar: agent identity on the left, the channel
// stepper in the center (completed nodes fill, the active node glows, every
// node is a seek target), live run stats and playback controls on the right.
// The simulated-environment disclosure stays pinned here at all times.
export default function WorkspaceBar({
  channels,
  activeId,
  elapsed,
  total,
  counts,
  supplierCount,
  speed,
  setSpeed,
  done,
  skip,
  replay,
  onJump,
}) {
  const present = CHANNEL_DEFS.filter((d) => channels.some((c) => c.id === d.id))
  const progress = total > 0 ? Math.min(1, elapsed / total) : 0

  return (
    <header className="ows-bar">
      <div className="ows-bar__inner">
        <a className="ows-bar__id" href="/" aria-label="Back to discovery">
          <span className="ows-bar__mark">
            <SparklesIcon size={13} />
          </span>
          <span className="ows-bar__idtext">
            <span className="ows-bar__agent">Dana Whitfield</span>
            <span className="ows-bar__role">
              Aekovera Agent · {supplierCount === 1 ? '1 supplier' : `${supplierCount} suppliers`}
            </span>
          </span>
        </a>

        <nav className="ows-stepper" aria-label="Outreach channels">
          {present.map((d, i) => {
            const ch = channels.find((c) => c.id === d.id)
            const isDone = elapsed >= ch.end
            const isActive = d.id === activeId
            return (
              <button
                key={d.id}
                type="button"
                className={[
                  'ows-stepper__node',
                  isDone ? 'ows-stepper__node--done' : '',
                  isActive ? 'ows-stepper__node--active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => onJump(ch.start)}
                title={`Jump to ${d.label}`}
                aria-current={isActive ? 'step' : undefined}
              >
                <span className="ows-stepper__dot">
                  {isDone ? <CheckCircleIcon size={13} /> : <i aria-hidden="true" />}
                </span>
                <span className="ows-stepper__label">{d.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="ows-bar__right">
          <span className="ows-bar__counts" aria-live="polite">
            {counts.contacted} contacted · {counts.replies} {counts.replies === 1 ? 'reply' : 'replies'} ·{' '}
            {counts.confirmed} {counts.confirmed === 1 ? 'confirmation' : 'confirmations'}
          </span>
          <div className="pace" role="group" aria-label="Playback speed">
            <span className="pace__label">Pace</span>
            <input
              type="range"
              min="0.5"
              max="4"
              step="0.25"
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              aria-label="Playback speed"
            />
            <span className="pace__value">{speed}×</span>
          </div>
          {done ? (
            <button type="button" className="btn--chip" onClick={replay}>
              <RotateCcwIcon size={13} /> Replay
            </button>
          ) : (
            <button type="button" className="btn--chip" onClick={skip}>
              <FastForwardIcon size={13} /> Skip to end
            </button>
          )}
          <span className="sim-chip sim-chip--bar">Simulated environment · no real emails, calls, or forms are sent</span>
        </div>
      </div>
      <span className="ows-bar__progress" aria-hidden="true">
        <span style={{ transform: `scaleX(${progress})` }} />
      </span>
    </header>
  )
}
