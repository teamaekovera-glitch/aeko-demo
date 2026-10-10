// Server-side Gemini integration. Two keys; the first that successfully mints a
// token becomes "primary" (cached in module scope), the other is used on 429/403.
// Keys are NEVER returned or logged.
import { GoogleGenAI } from '@google/genai'
import { fallbackParse, normalizeParsed } from './parser.js'

export const liveModel = () => process.env.GEMINI_LIVE_MODEL || 'gemini-3.8-live'
export const textModel = () => process.env.GEMINI_TEXT_MODEL || 'gemini-3.8-flash'
export const voice = () => process.env.GEMINI_VOICE || 'Umbriel'
// Voice recipe (voice.md): Umbriel on gemini-2.5-pro-preview-tts with a casual
// phone-call style direction. Newer TTS models read the direction aloud — keep 2.5 pro.
export const ttsModel = () => process.env.GEMINI_TTS_MODEL || 'gemini-2.5-pro-preview-tts'
export const TTS_STYLE = 'Say casually, like a real person on the phone: '

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
  const kw = fallbackParse(query, language)
  let ai
  try {
    ai = await parseQuery(query, language)
  } catch {
    return kw
  }
  // Gemini sometimes returns empty arrays; keep the keyword parser's hits so
  // equipment/capabilities always drive matching and the UNDERSTOOD chips.
  const merge = (a, b) => [...new Set([...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])])]
  return {
    ...kw,
    ...Object.fromEntries(Object.entries(ai || {}).filter(([, v]) => v != null && v !== '')),
    specialty: {
      ...(kw.specialty || {}),
      ...(ai?.specialty || {}),
      equipment: merge(ai?.specialty?.equipment, kw.specialty?.equipment),
      capabilities: merge(ai?.specialty?.capabilities, kw.specialty?.capabilities),
    },
    searchTerms: merge(ai?.searchTerms, kw.searchTerms),
  }
}

// ---- scripted lines (POST /api/tts) -------------------------------------------
// Returns { audio: base64 PCM16 mono 24 kHz, mimeType }. Cached per text+voice in
// module scope so repeated demo lines are instant on a warm function.
const ttsCache = new Map()

async function ttsWithKey(apiKey, text, voiceName) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${ttsModel()}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ parts: [{ text: TTS_STYLE + text }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
      },
    }),
    signal: AbortSignal.timeout(45_000),
  })
  if (!res.ok) throw new Error(`gemini tts ${res.status}`)
  const data = await res.json()
  const part = (data?.candidates?.[0]?.content?.parts || []).find((p) => p.inlineData?.data)
  if (!part) throw new Error('gemini tts: no audio')
  return { audio: part.inlineData.data, mimeType: part.inlineData.mimeType || 'audio/L16;codec=pcm;rate=24000' }
}

export async function synthesize(text, voiceName = voice()) {
  const key = `${voiceName}::${text}`
  if (ttsCache.has(key)) return ttsCache.get(key)
  const list = ordered()
  if (!list.length) throw httpError(503, 'GEMINI_NOT_CONFIGURED')
  let last
  for (const [, apiKey] of list) {
    try {
      const out = await ttsWithKey(apiKey, text, voiceName)
      ttsCache.set(key, out)
      return out
    } catch (e) { last = e }
  }
  throw httpError(502, 'GEMINI_TTS_UNAVAILABLE', last?.message || last)
}
