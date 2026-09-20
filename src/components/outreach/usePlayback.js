import { useCallback, useEffect, useState } from 'react'

// Playback engine for the outreach simulation: a wall clock advancing at the
// chosen speed, plus skip / replay / seek and follow-camera state.
//
// `playing` gates the clock so the workspace can hold on the launch screen
// until the user clicks "Launch outreach". `seekTo` jumps the timeline to any
// moment (used by the channel stepper) — it lands at a channel boundary and
// the run resumes from there.
export function usePlayback(total, { playing = true, initialSpeed = 0.75 } = {}) {
  const [elapsed, setElapsed] = useState(0)
  // Showcase default: 0.75× gives presenters a calmer run; the Pace slider in
  // the workspace bar moves it live between 0.5× (half speed) and 4×.
  // Surfaces that need their own pacing (the in-call montage) pass initialSpeed.
  const [speed, setSpeed] = useState(initialSpeed)
  const [instant, setInstant] = useState(false)
  const [runId, setRunId] = useState(0)
  const [following, setFollowing] = useState(true)

  const done = elapsed >= total

  useEffect(() => {
    if (done || !playing) return
    let raf
    let last = performance.now()
    const tick = (now) => {
      const dt = Math.min((now - last) / 1000, 0.25) // clamp tab-switch jumps
      last = now
      // Accumulate raw time — quantizing per frame would swallow sub-step
      // deltas (60fps dt ≈ 17ms < 50ms grid) and stall the clock entirely.
      setElapsed((e) => Math.min(e + dt * speed, total))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [done, speed, total, runId, playing])

  // Any manual scroll intent pauses the follow-camera.
  useEffect(() => {
    const off = () => setFollowing(false)
    window.addEventListener('wheel', off, { passive: true })
    window.addEventListener('touchmove', off, { passive: true })
    return () => {
      window.removeEventListener('wheel', off)
      window.removeEventListener('touchmove', off)
    }
  }, [])

  const skip = useCallback(() => {
    setInstant(true)
    setElapsed(total)
  }, [total])

  const replay = useCallback(() => {
    setInstant(false)
    setElapsed(0)
    setFollowing(true)
    setRunId((r) => r + 1)
  }, [])

  // Jump to an arbitrary moment (channel starts come from the stepper).
  // Clears the post-skip instant state so animations play again.
  const seekTo = useCallback(
    (t) => {
      setInstant(false)
      setFollowing(true)
      setElapsed(Math.max(0, Math.min(t, total)))
    },
    [total],
  )

  return {
    elapsed,
    speed,
    setSpeed,
    instant,
    runId,
    following,
    setFollowing,
    done,
    skip,
    replay,
    seekTo,
  }
}
