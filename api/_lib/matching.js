// Deterministic supplier scoring (contract §4):
//   category +40, each equipment/capability/specialty keyword hit +15,
//   capacity >= volume +20, moq <= volume +10.
// Ties break toward is_live_demo suppliers, then by name — this keeps the
// ranking stable and guarantees the 3 live demo suppliers rank top 3 for the
// cookie brief when paired with the seed data (see supabase/seed.sql).

function collectKeywords(request) {
  const out = new Set()
  const add = (v) => {
    const t = String(v).trim().toLowerCase()
    if (t.length >= 3) out.add(t)
  }
  const walk = (v) => {
    if (v == null) return
    if (Array.isArray(v)) v.forEach(walk)
    else if (typeof v === 'object') Object.values(v).forEach(walk)
    else add(v)
  }
  walk(request.specialty || {})
  for (const t of request.searchTerms || []) add(t)
  return [...out]
}

const fmt = (n) => Number(n).toLocaleString('en-US')

export function scoreSuppliers(request, suppliers) {
  const keywords = collectKeywords(request)
  const category = String(request.category || '').toLowerCase()
  const volume = Number(request.volume) || null

  const scored = suppliers.map((s) => {
    let score = 0
    const reasons = []

    const cat = String(s.category || '').toLowerCase()
    if (category && cat && cat === category) {
      score += 40
      reasons.push(`Category match: ${category}`)
    }

    const haystack = [...(Array.isArray(s.equipment) ? s.equipment : []), ...(Array.isArray(s.capabilities) ? s.capabilities : [])]
      .join(' ')
      .toLowerCase()
    for (const kw of keywords) {
      if (haystack.includes(kw)) {
        score += 15
        reasons.push(`Keyword hit: "${kw}"`)
      }
    }

    const cap = s.capacity_per_month
    if (volume && cap != null && cap >= volume) {
      score += 20
      reasons.push(`Capacity ${fmt(cap)}/mo ≥ volume ${fmt(volume)}`)
    }

    if (volume && s.moq != null && s.moq <= volume) {
      score += 10
      reasons.push(`MOQ ${fmt(s.moq)} within volume ${fmt(volume)}`)
    }

    return { supplier: s, score, reasons }
  })

  scored.sort(
    (a, b) =>
      b.score - a.score ||
      (b.supplier.is_live_demo ? 1 : 0) - (a.supplier.is_live_demo ? 1 : 0) ||
      String(a.supplier.name).localeCompare(String(b.supplier.name))
  )
  return scored
}
