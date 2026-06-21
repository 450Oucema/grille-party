import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const backendPort = process.env.VITE_BACKEND_PORT ?? '3035'
const socketPath = process.env.VITE_SOCKET_PATH ?? '/g/grille-party/socket.io'

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH ?? '/g/grille-party/',
  server: {
    port: 5173,
    host: true,
    proxy: {
      [socketPath]: {
        target: `http://localhost:${backendPort}`,
        ws: true,
        changeOrigin: true,
      },
      '/api': {
        target: `http://localhost:${backendPort}`,
        changeOrigin: true,
      },
    },
  },
})
