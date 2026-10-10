// Route table — static segments are matched before :params by declaration order.
// `public: true` skips the Authorization: Bearer check (contract: only /api/health
// and /api/auth/login are public).

export const ROUTES = [
  { method: 'GET', pattern: 'health', handler: 'health', public: true },
  { method: 'POST', pattern: 'auth/login', handler: 'login', public: true },
  { method: 'GET', pattern: 'auth/me', handler: 'me' },
  { method: 'POST', pattern: 'auth/logout', handler: 'logout' },

  { method: 'POST', pattern: 'requests/parse', handler: 'parse' },
  { method: 'POST', pattern: 'requests', handler: 'createRequest' },
  { method: 'GET', pattern: 'requests', handler: 'listRequests' },
  { method: 'GET', pattern: 'requests/:id', handler: 'getRequest' },
  { method: 'POST', pattern: 'requests/:id/match', handler: 'match' },
  { method: 'POST', pattern: 'requests/:id/calls', handler: 'createCalls' },

  { method: 'GET', pattern: 'calls/incoming', handler: 'incoming' },
  { method: 'GET', pattern: 'calls/active', handler: 'active' },
  { method: 'GET', pattern: 'calls/:id', handler: 'getCall' },
  { method: 'POST', pattern: 'calls/:id/accept', handler: 'accept' },
  { method: 'POST', pattern: 'calls/:id/events', handler: 'addEvent' },
  { method: 'POST', pattern: 'calls/:id/outcome', handler: 'outcome' },
  { method: 'POST', pattern: 'calls/:id/end', handler: 'end' },

  { method: 'POST', pattern: 'live/token', handler: 'liveToken' },
  { method: 'GET', pattern: 'live/context', handler: 'liveContext' },
  { method: 'POST', pattern: 'tts', handler: 'tts' },

  { method: 'GET', pattern: 'config', handler: 'config' },
  { method: 'POST', pattern: 'admin/reset-demo', handler: 'resetDemo' },
]
