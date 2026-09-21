import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Preview-host allowlist for the Obvious sandbox proxy (dev server only;
  // ignored by the production build).
  server: {
    allowedHosts: ['5173-iyph86pq76fnilfh4cejp.e2b.app'],
  },
})
