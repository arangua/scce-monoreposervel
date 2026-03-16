import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth': {
        target: 'https://scce-api-piloto-neon.onrender.com',
        changeOrigin: true,
        secure: true,
      },
      '/me': {
        target: 'https://scce-api-piloto-neon.onrender.com',
        changeOrigin: true,
        secure: true,
      },
      '/contexts': {
        target: 'https://scce-api-piloto-neon.onrender.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
