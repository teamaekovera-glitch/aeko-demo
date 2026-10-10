import crypto from 'node:crypto'

export function json(res, status, body) {
  const payload = JSON.stringify(body)
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(payload)
}

export function fail(res, status, code) {
  json(res, status, { error: code })
}

export function readBody(req, limit = 1_000_000) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (c) => {
      size += c.length
      if (size > limit) {
        const err = new Error('payload too large')
        err.status = 413
        err.code = 'PAYLOAD_TOO_LARGE'
        reject(err)
        req.destroy()
        return
      }
      chunks.push(c)
    })
    req.on('end', () => {
      if (!chunks.length) return resolve({})
      try {
        const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'))
        resolve(parsed && typeof parsed === 'object' ? parsed : {})
      } catch {
        const err = new Error('invalid json body')
        err.status = 400
        err.code = 'INVALID_JSON'
        reject(err)
      }
    })
    req.on('error', reject)
  })
}

export function newId(prefix) {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`
}

export function newToken() {
  return crypto.randomBytes(32).toString('hex')
}

export function nowIso() {
  return new Date().toISOString()
}

export function toInt(v) {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? Math.round(n) : null
}
