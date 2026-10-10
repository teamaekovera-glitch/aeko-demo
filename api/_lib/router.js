// Tiny internal router for the single catch-all Vercel function.
// Patterns are path segments relative to /api, e.g. 'requests/:id/match'.

export function matchRoute(routes, segs, method) {
  for (const route of routes) {
    if (method != null && route.method !== method) continue
    const patternSegs = route.pattern.split('/')
    if (patternSegs.length !== segs.length) continue
    const params = {}
    let ok = true
    for (let i = 0; i < patternSegs.length; i++) {
      const p = patternSegs[i]
      if (p.startsWith(':')) params[p.slice(1)] = safeDecode(segs[i])
      else if (p !== segs[i]) { ok = false; break }
    }
    if (ok) return { route, params }
  }
  return null
}

function safeDecode(s) {
  try { return decodeURIComponent(s) } catch { return s }
}
