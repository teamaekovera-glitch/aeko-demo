import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Dev server: allow any host (the hard-coded e2b host broke elsewhere) and
  // proxy /api to the local API server when running vite standalone
  // (`vercel dev` serves both without the proxy).
  server: {
    allowedHosts: true,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  preview: {
    allowedHosts: true,
  },
})
