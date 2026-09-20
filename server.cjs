// Zero-dependency static server for the built demo (dist/).
// SPA fallback: any unknown path serves index.html so client-side routes work.
const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')

const PORT = Number(process.env.PORT || 3000)
const ROOT = path.join(__dirname, 'dist')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
}

http
  .createServer((req, res) => {
    let pathname
    try {
      pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
    } catch {
      pathname = '/'
    }
    let file = path.normalize(path.join(ROOT, pathname))
    if (!file.startsWith(ROOT)) {
      res.writeHead(403)
      return res.end('Forbidden')
    }
    if (pathname === '/' || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      file = path.join(ROOT, 'index.html')
    }
    const ext = path.extname(file)
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=86400',
    })
    fs.createReadStream(file).pipe(res)
  })
  .listen(PORT, '0.0.0.0', () => {
    console.log(`Aekovera demo serving dist/ on port ${PORT}`)
  })
