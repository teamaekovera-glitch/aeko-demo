// snake_case DB columns -> camelCase API responses (contract: never rename a field, only add)

const arr = (v) => (Array.isArray(v) ? v : [])
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {})

export function mapUser(u) {
  if (!u) return null
  return {
    id: u.id,
    email: u.email,
    role: u.role,
    name: u.name ?? null,
    company: u.company ?? null,
    supplierId: u.supplier_id ?? null,
    createdAt: u.created_at ?? null,
  }
}

export function mapSupplier(s) {
  if (!s) return null
  return {
    id: s.id,
    name: s.name ?? null,
    location: s.location ?? null,
    email: s.email ?? null,
    category: s.category ?? null,
    capabilities: arr(s.capabilities),
    equipment: arr(s.equipment),
    certifications: arr(s.certifications),
    moq: s.moq ?? null,
    capacityPerMonth: s.capacity_per_month ?? null,
    languages: arr(s.languages),
    isLiveDemo: !!s.is_live_demo,
    talkingPoints: s.talking_points ?? null,
  }
}

export function mapRequest(r, extra = {}) {
  if (!r) return null
  return {
    id: r.id,
    brandUserId: r.brand_user_id ?? null,
    rawQuery: r.raw_query ?? null,
    inputMode: r.input_mode ?? null,
    language: r.language ?? null,
    category: r.category ?? null,
    product: r.product ?? null,
    volume: r.volume ?? null,
    moq: r.moq ?? null,
    specialty: obj(r.specialty),
    searchTerms: arr(r.search_terms),
    deadline: r.deadline ?? null,
    status: r.status ?? 'NEW',
    createdAt: r.created_at ?? null,
    ...extra,
  }
}

export function mapCall(c, extra = {}) {
  if (!c) return null
  return {
    id: c.id,
    requestId: c.request_id ?? null,
    supplierId: c.supplier_id ?? null,
    status: c.status ?? 'RINGING',
    outcome: c.outcome ?? null,
    outcomeReason: c.outcome_reason ?? null,
    language: c.language ?? null,
    introSlot: c.intro_slot ?? null,
    startedAt: c.started_at ?? null,
    endedAt: c.ended_at ?? null,
    createdAt: c.created_at ?? null,
    ...extra,
  }
}

export function mapMatch(m, extra = {}) {
  if (!m) return null
  return {
    id: m.id,
    requestId: m.request_id ?? null,
    supplierId: m.supplier_id ?? null,
    score: m.score ?? 0,
    reasons: arr(m.reasons),
    rank: m.rank ?? null,
    ...extra,
  }
}

export function mapEvent(e) {
  if (!e) return null
  return {
    id: e.id,
    callId: e.call_id ?? null,
    kind: e.kind ?? null,
    speaker: e.speaker ?? null,
    text: e.text ?? null,
    data: e.data ?? null,
    createdAt: e.created_at ?? null,
  }
}
