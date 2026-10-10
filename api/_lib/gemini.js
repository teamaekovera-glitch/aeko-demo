// Server-side Gemini integration. Two keys; the first that successfully mints a
// token becomes "primary" (cached in module scope), the other is used on 429/403.
// Keys are NEVER returned or logged.
import { GoogleGenAI } from '@google/genai'
import { fallbackParse, normalizeParsed } from './parser.js'

export const liveModel = () => process.env.GEMINI_LIVE_MODEL || 'gemini-3.8-live'
export const textModel = () => process.env.GEMINI_TEXT_MODEL || 'gemini-3.8-flash'
export const voice = () => process.env.GEMINI_VOICE || 'Aoede'

// state.winner: undefined = unchecked, 'primary' | 'secondary' | null = none works
const state = { winner: undefined }

function keys() {
  return [
    ['primary', process.env.GEMINI_API_KEY],
    ['secondary', process.env.GEMINI_API_KEY_2],
  ].filter(([, v]) => !!v)
}

export function hasKeys() {
  return keys().length > 0
}

// Ephemeral Live token, minted with a server key. The browser connects with
// apiVersion v1alpha (required for auth tokens).
async function mintWithKey(apiKey) {
  const ai = new GoogleGenAI({ apiKey, httpOptions: { apiVersion: 'v1alpha' } })
  const now = Date.now()
  const token = await ai.authTokens.create({
    config: {
      uses: 1,
      expireTime: new Date(now + 30 * 60 * 1000).toISOString(),
      newSessionExpireTime: new Date(now + 2 * 60 * 1000).toISOString(),
      httpOptions: { apiVersion: 'v1alpha' },
    },
  })
  return token?.name || null
}

function ordered() {
  const list = keys()
  if (state.winner === 'secondary' && list.length > 1) return [list[1], list[0]]
  return list
}

// Returns 'primary' | 'secondary' | null. Mints a throwaway-token check on the
// first call only (cached afterwards). Used by /api/health.
export async function ensureKey() {
  if (state.winner !== undefined) return state.winner
  for (const [name, key] of keys()) {
    try {
      const t = await mintWithKey(key)
      if (t) { state.winner = name; return name }
    } catch { /* try the next key */ }
  }
  state.winner = null
  return null
}

function httpError(status, code, cause) {
  const err = new Error(code)
  err.status = status
  err.code = code
  if (cause) err.cause = String(cause).slice(0, 200)
  return err
}

// Mint an ephemeral token for /api/live/token. Tries the winner first, falls
// back to the other key on failure. Throws { status: 503 | 502 }.
export async function mintLiveToken() {
  const list = ordered()
  if (!list.length) throw httpError(503, 'GEMINI_NOT_CONFIGURED')
  let last
  for (const [name, key] of list) {
    try {
      const t = await mintWithKey(key)
      if (t) { state.winner = name; return t }
      last = new Error('empty token name')
    } catch (e) { last = e }
  }
  throw httpError(502, 'GEMINI_UNAVAILABLE', last?.message || last)
}

// ---- text parsing (POST /api/requests/parse) --------------------------------

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    category: { type: 'STRING', enum: ['cookies', 'beverages', 'sauces', 'snacks', 'packaging'] },
    product: { type: 'STRING' },
    volume: { type: 'INTEGER' },
    moq: { type: 'INTEGER' },
    specialty: {
      type: 'OBJECT',
      properties: {
        equipment: { type: 'ARRAY', items: { type: 'STRING' } },
        capabilities: { type: 'ARRAY', items: { type: 'STRING' } },
      },
    },
    searchTerms: { type: 'ARRAY', items: { type: 'STRING' } },
    deadline: { type: 'STRING' },
    language: { type: 'STRING' },
  },
  required: ['category', 'product', 'volume'],
}

function buildPrompt(query, language) {
  return [
    'You extract structured sourcing requirements from a brand\'s request for a manufacturing demo.',
    'Return ONLY JSON matching this shape:',
    '{"category":"cookies|beverages|sauces|snacks|packaging","product":"<short product name>",' +
    '"volume":<integer units>,"moq":<integer or null>,' +
    '"specialty":{"equipment":["<canonical equipment keywords, e.g. \\"tunnel oven\\">"],"capabilities":["<canonical capability keywords, e.g. \\"allergen\\">"]},' +
    '"searchTerms":["<3-6 short lowercase search keywords>"],"deadline":"<as stated or null>","language":"<BCP-47 or null>"}',
    'Rules: numbers must be integers (strip commas/words; "500k" and "half a million" are 500000).',
    'specialty.equipment / specialty.capabilities hold only CONCISE canonical keywords found in the query (e.g. "tunnel oven", "allergen"); do not pad them.',
    'Do not invent values that are not in the text.',
    language ? `The request is spoken/typed in language: ${language}.` : '',
    'Request text:',
    query,
  ]
    .filter(Boolean)
    .join('\n')
}

async function generateWithKey(apiKey, query, language) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${textModel()}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: buildPrompt(query, language) }] }],
      generationConfig: { temperature: 0.2, responseMimeType: 'application/json', responseSchema: RESPONSE_SCHEMA },
    }),
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new Error(`gemini ${res.status}`)
  const data = await res.json()
  const text = (data?.candidates?.[0]?.content?.parts || []).map((p) => p.text).filter(Boolean).join('')
  return normalizeParsed(JSON.parse(text), language)
}

export async function parseQuery(query, language) {
  const list = ordered()
  if (!list.length) throw httpError(503, 'GEMINI_NOT_CONFIGURED')
  let last
  for (const [, key] of list) {
    try {
      return await generateWithKey(key, query, language)
    } catch (e) { last = e }
  }
  throw last
}

// Never fails: falls back to the regex/keyword parser on any Gemini problem.
export async function parseWithFallback(query, language) {
  try {
    return await parseQuery(query, language)
  } catch {
    return fallbackParse(query, language)
  }
}
