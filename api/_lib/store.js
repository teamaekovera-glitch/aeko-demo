// All data access for the demo API. Each makeStore(db) returns a plain object of
// functions; tests inject an in-memory store with the same interface.

function throwDb(error) {
  // Supabase/postgrest error — safe to log server-side, never returned raw to clients.
  const err = new Error(`db error: ${error?.message || error}`)
  err.isDb = true
  throw err
}

export function makeStore(db) {
  const s = {
    async ping() {
      const { error } = await db.from('users').select('id').limit(1)
      return !error
    },

    // ---- users & sessions -------------------------------------------------
    async getUserByEmail(email) {
      const { data, error } = await db.from('users').select('*').eq('email', String(email).trim().toLowerCase()).maybeSingle()
      if (error) throwDb(error)
      return data
    },
    async getUserById(id) {
      const { data, error } = await db.from('users').select('*').eq('id', id).maybeSingle()
      if (error) throwDb(error)
      return data
    },
    async getUserByToken(token) {
      const { data: sess, error } = await db.from('sessions').select('*').eq('token', token).maybeSingle()
      if (error) throwDb(error)
      if (!sess) return null
      return s.getUserById(sess.user_id)
    },
    async createSession(token, userId) {
      const { error } = await db.from('sessions').insert({ token, user_id: userId })
      if (error) throwDb(error)
    },
    async deleteSession(token) {
      const { error } = await db.from('sessions').delete().eq('token', token)
      if (error) throwDb(error)
    },

    // ---- suppliers ----------------------------------------------------------
    async listSuppliers() {
      const { data, error } = await db.from('suppliers').select('*').order('name', { ascending: true }).limit(1000)
      if (error) throwDb(error)
      return data || []
    },

    async getSupplier(id) {
      const { data, error } = await db.from('suppliers').select('*').eq('id', id).maybeSingle()
      if (error) throwDb(error)
      return data
    },

    // ---- project requests ---------------------------------------------------
    async insertRequest(row) {
      const { data, error } = await db.from('project_requests').insert(row).select().single()
      if (error) throwDb(error)
      return data
    },
    async getRequest(id) {
      const { data, error } = await db.from('project_requests').select('*').eq('id', id).maybeSingle()
      if (error) throwDb(error)
      return data
    },
    async listRequests({ brandUserId } = {}) {
      let q = db.from('project_requests').select('*').order('created_at', { ascending: false }).limit(500)
      if (brandUserId) q = q.eq('brand_user_id', brandUserId)
      const { data, error } = await q
      if (error) throwDb(error)
      return data || []
    },
    async updateRequest(id, patch) {
      const { data, error } = await db.from('project_requests').update(patch).eq('id', id).select().single()
      if (error) throwDb(error)
      return data
    },
    async latestRequestByStatuses(statuses, brandUserId = null) {
      let q = db.from('project_requests').select('*').in('status', statuses).order('created_at', { ascending: false }).limit(1)
      if (brandUserId) q = q.eq('brand_user_id', brandUserId)
      const { data, error } = await q.maybeSingle()
      if (error) throwDb(error)
      return data || null
    },

    // ---- matches --------------------------------------------------------------
    async replaceMatches(requestId, rows) {
      const del = await db.from('matches').delete().eq('request_id', requestId)
      if (del.error) throwDb(del.error)
      if (!rows.length) return
      const ins = await db.from('matches').insert(rows)
      if (ins.error) throwDb(ins.error)
    },
    async listMatchesForRequest(requestId) {
      const { data, error } = await db.from('matches').select('*').eq('request_id', requestId).order('rank', { ascending: true }).limit(50)
      if (error) throwDb(error)
      return data || []
    },

    // ---- calls ------------------------------------------------------------------
    async insertCalls(rows) {
      const { data, error } = await db.from('calls').insert(rows).select()
      if (error) throwDb(error)
      return data || []
    },
    async getCall(id) {
      const { data, error } = await db.from('calls').select('*').eq('id', id).maybeSingle()
      if (error) throwDb(error)
      return data
    },
    async updateCall(id, patch) {
      const { data, error } = await db.from('calls').update(patch).eq('id', id).select().single()
      if (error) throwDb(error)
      return data
    },
    async listCalls({ supplierId, requestId, statuses, limit = 200, orderDesc = true } = {}) {
      let q = db.from('calls').select('*').limit(limit)
      if (supplierId) q = q.eq('supplier_id', supplierId)
      if (requestId) q = q.eq('request_id', requestId)
      if (statuses?.length) q = q.in('status', statuses)
      q = q.order('created_at', { ascending: !orderDesc })
      const { data, error } = await q
      if (error) throwDb(error)
      return data || []
    },

    // ---- call events -----------------------------------------------------------
    async insertEvent(row) {
      const { data, error } = await db.from('call_events').insert(row).select().single()
      if (error) throwDb(error)
      return data
    },
    async listEventsForCalls(callIds) {
      if (!callIds.length) return []
      const { data, error } = await db
        .from('call_events')
        .select('*')
        .in('call_id', callIds)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .limit(5000)
      if (error) throwDb(error)
      return data || []
    },

    // ---- admin ------------------------------------------------------------------
    async resetDemo() {
      // Deletes requests, matches, calls and events; keeps users, suppliers, sessions.
      const steps = [
        ['call_events', 'id', 0],
        ['calls', 'id', ''],
        ['matches', 'id', ''],
        ['project_requests', 'id', ''],
      ]
      for (const [table, col, sentinel] of steps) {
        const { error } = await db.from(table).delete().neq(col, sentinel)
        if (error) throwDb(error)
      }
    },
  }
  return s
}
