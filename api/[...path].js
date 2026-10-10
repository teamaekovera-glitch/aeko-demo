// Single catch-all Vercel serverless function (Hobby plan: 12-function limit).
// All /api/* traffic is routed here; api/_lib/* is shared code (underscore files
// are not deployed as separate functions).
import { createApp } from './_lib/app.js'

const app = createApp()

export default async function handler(req, res) {
  return app(req, res)
}

// We parse the JSON body ourselves (size cap + consistent error codes).
export const config = {
  api: { bodyParser: false },
}
