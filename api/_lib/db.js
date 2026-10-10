import { createClient } from '@supabase/supabase-js'

// Singleton Supabase client using the SERVICE ROLE key. Server-side only —
// the service key must never reach the browser (only /api/config's anon key does).
let _client = null

export function db() {
  if (_client) return _client
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return _client
}
