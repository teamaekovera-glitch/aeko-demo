// Regex/keyword fallback parser (used whenever Gemini is unavailable).
// Handles: "500,000"/"500k"/"half a million", category words, equipment words
// like "tunnel oven", "allergen", MOQ, deadline mentions.

const CATEGORIES = [
  ['cookies', /\b(cookies?|biscuits?|brownies?|blondies?)\b/i],
  ['beverages', /\b(beverages?|drinks?|juices?|teas?|coffees?|sodas?|syrups?)\b/i],
  ['sauces', /\b(sauces?|salsas?|dressings?|condiments?|marinades?|mayo)\b/i],
  ['snacks', /\b(snacks?|chips?|crackers?|pretzels?|bars?)\b/i],
  ['packaging', /\b(packaging|cartons?|labels?|corrugate|bottles?|pouches?|sleeves?)\b/i],
]

const EQUIPMENT_WORDS = [
  'tunnel oven', 'rack oven', 'rotary oven', 'band oven', 'co-extruder', 'extruder',
  'hot-fill', 'retort', 'aseptic', 'glass bottling', 'canning line', 'pouch filling',
  'flow-wrap', 'shrink tunnel', 'depositor', 'fryers',
]

const CAPABILITY_WORDS = ['allergen', 'nut-free', 'gluten-free', 'kosher', 'organic', 'private label', 'refrigerated']

function parseNumberToken(t) {
  const s = String(t).replace(/,/g, '').trim()
  const m = /^(\d+(?:\.\d+)?)\s*([kKmM]?)/.exec(s)
  if (!m) return null
  const n = parseFloat(m[1])
  const suffix = (m[2] || '').toLowerCase()
  if (suffix === 'm') return Math.round(n * 1e6)
  if (suffix === 'k') return Math.round(n * 1e3)
  return Math.round(n)
}

export function fallbackParse(query, language) {
  const text = String(query || '')
  const lower = text.toLowerCase()
  const parsed = {
    category: null,
    product: null,
    volume: null,
    moq: null,
    specialty: { equipment: [], capabilities: [] },
    searchTerms: [],
    deadline: null,
    language: language || null,
  }

  // Volume: words first, then k/m suffixes, then "<n> packs/units", then bare large number.
  if (/\bhalf a million\b/i.test(lower)) parsed.volume = 500000
  else if (/\b(a|one) million\b/i.test(lower)) parsed.volume = 1000000
  else {
    const mm = /(\d+(?:\.\d+)?)\s*million\b/i.exec(lower)
    if (mm) parsed.volume = Math.round(parseFloat(mm[1]) * 1e6)
  }
  if (parsed.volume == null) {
    const mk = /([\d][\d,\.]*\s*[kK])\b/.exec(lower) || /\b([\d][\d,\.]*\s*[kK])\s*(?:packs?|units?|cases?)/.exec(lower)
    if (mk) parsed.volume = parseNumberToken(mk[1])
  }
  if (parsed.volume == null) {
    const mu = /([\d][\d,\.]*)\s*(?:packs?|units?|cases?|pieces?|pcs)\b/i.exec(lower)
    if (mu) parsed.volume = parseNumberToken(mu[1])
  }
  if (parsed.volume == null) {
    const mb = /\b([\d][\d,]{2,})\b/.exec(lower)
    if (mb) parsed.volume = parseNumberToken(mb[1])
  }

  // MOQ: "moq 50,000" / "minimum 50k"
  const moqMatch = /\b(?:moq|min(?:imum)?)\b[\s:]{0,3}(?:of\s+|is\s+)?([\d][\d,\.]*\s*[kKmM]?)/.exec(lower)
  if (moqMatch) parsed.moq = parseNumberToken(moqMatch[1])

  // Category
  for (const [cat, re] of CATEGORIES) {
    if (re.test(lower)) { parsed.category = cat; break }
  }

  // Product: first comma/newline segment without digits
  const segments = text.split(/[,\n]/).map((s) => s.trim()).filter(Boolean)
  const productSeg = segments.find((s) => !/\d/.test(s) && s.length <= 60)
  if (productSeg) parsed.product = productSeg.toLowerCase()

  // Specialty keywords (canonical, concise — these double as match keywords)
  const equipment = []
  for (const e of EQUIPMENT_WORDS) if (lower.includes(e)) equipment.push(e)
  const capabilities = []
  for (const c of CAPABILITY_WORDS) if (lower.includes(c)) capabilities.push(c)
  if (equipment.length) parsed.specialty.equipment = equipment
  if (capabilities.length) parsed.specialty.capabilities = capabilities

  // searchTerms: comma segments without digits, lowercased
  parsed.searchTerms = segments
    .filter((s) => !/\d/.test(s))
    .map((s) => s.toLowerCase())
    .filter((s) => s.length >= 3)

  // Deadline: "by March 15", "before Q2", "by October"
  const dl = /\b(?:by|before|for)\s+((?:jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may|jun(e)?|jul(y)?|aug(ust)?|sep(t|tember)?|oct(ober)?|nov(ember)?|dec(ember)?)\.?\s*\d{0,2}|q[1-4](\s*\d{4})?|easter|christmas|summer|fall|winter|spring)\b/i.exec(text)
  if (dl) parsed.deadline = dl[1]

  return parsed
}

// Coerce a (possibly Gemini-produced) parse into the canonical shape.
export function normalizeParsed(raw, language) {
  const r = raw && typeof raw === 'object' ? raw : {}
  const parsed = {
    category: null,
    product: null,
    volume: null,
    moq: null,
    specialty: { equipment: [], capabilities: [] },
    searchTerms: [],
    deadline: null,
    language: language || null,
  }

  const asString = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null)
  const asInt = (v) => {
    if (v == null || v === '') return null
    if (typeof v === 'string') {
      const n = parseNumberToken(v)
      return Number.isFinite(n) ? n : null
    }
    const n = Number(v)
    return Number.isFinite(n) ? Math.round(n) : null
  }
  const asArr = (v) => (Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : typeof v === 'string' && v.trim() ? [v.trim()] : [])

  // Category: validate against the known five; singulars map to plurals.
  const catRaw = asString(r.category)
  if (catRaw) {
    for (const [cat, re] of CATEGORIES) if (re.test(catRaw)) { parsed.category = cat; break }
    if (!parsed.category && ['cookies', 'beverages', 'sauces', 'snacks', 'packaging'].includes(catRaw.toLowerCase())) {
      parsed.category = catRaw.toLowerCase()
    }
  }

  parsed.product = asString(r.product)?.toLowerCase() || null
  parsed.volume = asInt(r.volume)
  parsed.moq = asInt(r.moq)
  parsed.deadline = asString(r.deadline)

  const sp = r.specialty && typeof r.specialty === 'object' && !Array.isArray(r.specialty) ? r.specialty : {}
  const equipment = asArr(sp.equipment)
  const capabilities = asArr(sp.capabilities)
  if (equipment.length) parsed.specialty.equipment = equipment.map((s) => s.toLowerCase())
  if (capabilities.length) parsed.specialty.capabilities = capabilities.map((s) => s.toLowerCase())
  // Preserve any extra specialty keys Gemini returned (never drop data).
  for (const [k, v] of Object.entries(sp)) {
    if (k !== 'equipment' && k !== 'capabilities' && v != null) parsed.specialty[k] = v
  }

  const terms = asArr(r.searchTerms).map((s) => s.toLowerCase())
  parsed.searchTerms = terms

  return parsed
}
