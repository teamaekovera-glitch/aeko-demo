# Aeko Live API — Contract v1 (FIXED)

Part B (UI + Gemini Live in the browser) codes against this document. **Never rename a
field — only add new ones.**

- JSON everywhere. Errors are `{ "error": "<code>" }` with a correct HTTP status.
- `Authorization: Bearer <token>` on everything **except** `/api/health` and `/api/auth/login`.
- Responses use camelCase keys (mapped from snake_case columns).
- One Vercel Node serverless function: `api/[...path].js` (Hobby 12-function limit).
  Shared code in `api/_lib/` (`_` prefix = not a function).

## Error codes

| code | status | when |
|---|---|---|
| `VALIDATION` | 400 | missing/invalid request body fields |
| `INVALID_JSON` | 400 | body is not valid JSON |
| `INVALID_OUTCOME` | 400 | outcome not in YES/NO/MAYBE |
| `INVALID_PURPOSE` | 400 | live token purpose not brand_intake/supplier_call |
| `PAYLOAD_TOO_LARGE` | 413 | body over 1 MB |
| `UNAUTHORIZED` | 401 | missing/unknown session token |
| `INVALID_CREDENTIALS` | 401 | wrong email or password |
| `FORBIDDEN` | 403 | wrong role / not your resource |
| `NOT_FOUND` | 404 | unknown path or id |
| `METHOD_NOT_ALLOWED` | 405 | right path, wrong verb |
| `CALL_ALREADY_ENDED` | 409 | accept/end on a finished call |
| `DB_NOT_CONFIGURED` | 500 | server missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY |
| `CONFIG_MISSING` | 500 | server missing public config values |
| `INTERNAL` | 500 | unhandled server error |
| `GEMINI_NOT_CONFIGURED` | 503 | no GEMINI_API_KEY / GEMINI_API_KEY_2 on the server |
| `GEMINI_UNAVAILABLE` | 502 | both Gemini keys failed token minting |

## Endpoints

```
GET  /api/health                 -> { ok, db: "supabase", geminiKey: "primary"|"secondary"|"none", dbError? }

POST /api/auth/login { email, password } -> { token, user: { id, email, role, name, company, supplierId } }
GET  /api/auth/me                -> { user }
POST /api/auth/logout            -> { ok: true }

POST /api/requests/parse { query, language? }
  -> { parsed: { category, product, volume, moq, specialty, searchTerms, deadline, language } }
  // Gemini (GEMINI_TEXT_MODEL) with a JSON response schema; does NOT save.
  // Falls back to a regex/keyword parser ("500,000"/"500k"/"half a million",
  // category words, equipment words like "tunnel oven", "allergen") on any Gemini failure.
  // `specialty` = { equipment: string[], capabilities: string[], ...extra }.

POST /api/requests { rawQuery, inputMode, language, category, product, volume, moq, specialty, searchTerms, deadline }
  -> { request }                  // status NEW, brandUserId = caller
GET  /api/requests               -> { requests }   // BRAND: own; ADMIN: all
GET  /api/requests/:id           -> { request, matches: [{ ...match, supplier }], calls: [{ ...call, supplier }] }
  // Part B addition: request.brandCompany (brand user's company).

POST /api/requests/:id/match     -> { request, matches: [{ supplier, score, reasons, rank }], scanned }
  // Deterministic: category +40, each equipment/capability/specialty keyword hit +15,
  // capacity >= volume +20, moq <= volume +10; ties break toward live-demo suppliers.
  // Stores the top 10; status MATCHING (NO_MATCH when nothing scored > 0 matches stored).
  // `scanned` = total supplier count ("N makers scanned").

POST /api/requests/:id/calls { supplierIds? }   // default: live-demo suppliers among the matches
  -> { calls }                    // RINGING rows; request status CALLING

GET  /api/calls/incoming         -> { call: { ...call, request, supplier } | null }
  // SUPPLIER only: newest RINGING|CONNECTED call for my supplier.
GET  /api/calls/active           -> { calls: [{ ...call, request, supplier }], request }
  // ADMIN/BRAND: calls of the latest CALLING|INTRO_BOOKED request.
  // Part B addition: every call here (and in GET /api/requests/:id) carries
  // lastAeko and lastSupplier — the latest call_events transcript text per speaker.
GET  /api/calls/:id              -> { call, request, supplier, events }
POST /api/calls/:id/accept       -> { call }   // CONNECTED, startedAt; idempotent; 409 if ended
POST /api/calls/:id/events { kind, speaker, text, data } -> { ok }
  // Final transcript lines only (low frequency) — live word-stream uses Broadcast channels.
POST /api/calls/:id/outcome { outcome, reason, language } -> { call }
  // YES: call.introSlot = "Tue 10:00", request status INTRO_BOOKED. NO/MAYBE: request unchanged.
POST /api/calls/:id/end          -> { call }   // ENDED, or MISSED if never accepted

POST /api/live/token { purpose: "brand_intake"|"supplier_call", callId? } -> { token, model, voice, expiresAt }
  // Ephemeral Gemini Live token minted server-side with GEMINI_API_KEY (or _2).
  // Tokens are created with httpOptions: { apiVersion: 'v1alpha' } — the browser
  // SDK (@google/genai) must also connect with apiVersion v1alpha for auth tokens.
GET  /api/live/context?callId=   -> { systemInstruction, request, supplier }
  // With callId: supplier-call instruction (§5 of the build brief).
  // Without: generic brand-intake instruction; request and supplier are null.

GET  /api/config                 -> { supabaseUrl, supabaseAnonKey }   // public values for browser Realtime
POST /api/admin/reset-demo       -> { ok }   // ADMIN only; deletes requests, matches, calls, events
```

## Roles

| role | sees |
|---|---|
| BRAND | own requests, own calls, `/calls/active` for own requests |
| SUPPLIER | `/calls/incoming` for their supplier, their own calls/events/outcome |
| ADMIN | everything, `/api/admin/reset-demo` |

## Notes

- Passwords are plaintext on purpose (demo only). Sessions are random 32-byte tokens in
  the `sessions` table; logout deletes the row.
- Supplier-call system instruction: built from DB (supplier, request, brand company) —
  template in the build brief §5; returned by `/api/live/context`.
- Realtime: `calls`, `project_requests`, `call_events` are in the `supabase_realtime`
  publication with read-all RLS policies so the monitor subscribes with the anon key
  (from `/api/config`). All writes go through the API with the service role key.
- All supplier, price, and order data is fictional and locally simulated.

## Local dev / verification

```bash
cp .env.example .env.local        # fill in; vercel dev reads .env.local/.env
vercel dev                        # serves Vite app + API together on :3000
# or split:
node server.cjs &                 # (Part B UI dev) — vite proxies /api to :3000
npm run dev                       # vite with server.proxy /api -> http://localhost:3000

npm run selftest                  # offline: whole API surface against an in-memory store
BASE_URL=https://<deployment> npm run smoke   # §8 done-when checks against a live deployment
```
