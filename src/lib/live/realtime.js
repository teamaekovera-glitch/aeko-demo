// Supabase Realtime for the live demo.
//  - Broadcast channel `aeko-live`: ephemeral transcript text + audio levels
//    sent browser-to-browser (supplier laptops → monitor). No DB writes.
//  - postgres_changes on calls / project_requests: durable status changes
//    written by the API (accept, outcome, end, request status).
//  - Polling fallback (every 1.5s) through the API so the monitor still
//    updates if Realtime is unavailable.
import { createClient } from '@supabase/supabase-js'
import { api } from './api.js'

let clientPromise = null

export function getSupabase() {
  if (!clientPromise) {
    clientPromise = api
      .config()
      .then(({ supabaseUrl, supabaseAnonKey }) => {
        if (!supabaseUrl || !supabaseAnonKey) return null
        return createClient(supabaseUrl, supabaseAnonKey, {
          auth: { persistSession: false, autoRefreshToken: false },
          realtime: { params: { eventsPerSecond: 30 } },
        })
      })
      .catch(() => null)
  }
  return clientPromise
}

const CHANNEL = 'aeko-live'

// Sender side (supplier laptop): returns { send(event, payload), close() }.
export async function openBroadcaster() {
  const sb = await getSupabase()
  if (!sb) return { send: () => {}, close: () => {} }
  const ch = sb.channel(CHANNEL, { config: { broadcast: { self: false, ack: false } } })
  await new Promise((resolve) => {
    const t = setTimeout(resolve, 3000)
    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        clearTimeout(t)
        resolve()
      }
    })
  })
  return {
    send: (event, payload) => {
      try {
        ch.send({ type: 'broadcast', event, payload })
      } catch {
        /* best effort */
      }
    },
    close: () => sb.removeChannel(ch),
  }
}

// Listener side (monitor / brand). Handlers:
//   onTranscript({ callId, speaker, text, final })
//   onLevel({ callId, speaker, level })
//   onCallChange(callRow)      — raw snake_case row from postgres_changes
//   onRequestChange(requestRow)
//   onPoll()                   — called every 1.5s as a fallback refresh
export function listen({ onTranscript, onLevel, onCallChange, onRequestChange, onPoll }) {
  let closed = false
  let sbRef = null
  let channels = []
  const pollTimer = setInterval(() => {
    if (!closed) onPoll?.()
  }, 1500)

  getSupabase().then((sb) => {
    if (!sb || closed) return
    sbRef = sb
    const live = sb
      .channel(CHANNEL, { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'transcript' }, ({ payload }) => onTranscript?.(payload))
      .on('broadcast', { event: 'level' }, ({ payload }) => onLevel?.(payload))
      .subscribe()
    const db = sb
      .channel('aeko-db')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calls' }, (p) => onCallChange?.(p.new))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_requests' }, (p) =>
        onRequestChange?.(p.new),
      )
      .subscribe()
    channels = [live, db]
  })

  return () => {
    closed = true
    clearInterval(pollTimer)
    if (sbRef) channels.forEach((c) => sbRef.removeChannel(c))
  }
}
