// Single Vercel serverless function (Hobby plan: 12-function limit).
// vercel.json rewrites /api/* here, carrying the original subpath in the
// __route query param — bracket catch-all filenames are NOT supported outside
// Next.js (they match only ONE segment). api/_lib/* is shared code (underscore
// files are not deployed as separate functions).
import { createApp } from './_lib/app.js'

const app = createApp()

export default async function handler(req, res) {
  return app(req, res)
}

// We parse the JSON body ourselves (size cap + consistent error codes).
export const config = {
  api: { bodyParser: false },
}
