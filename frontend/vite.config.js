import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const apiBaseUrl = (process.env.VITE_API_BASE_URL || '').trim()

  if (command === 'build' && !apiBaseUrl) {
    throw new Error('VITE_API_BASE_URL is required for production builds.')
  }

  return {
    plugins: [react()],
    server: {
      proxy: apiBaseUrl
        ? {
            '/auth': {
              target: apiBaseUrl,
              changeOrigin: true,
            },
            '/api': {
              target: apiBaseUrl,
              changeOrigin: true,
            },
            '/webhook': {
              target: apiBaseUrl,
              changeOrigin: true,
            },
            '/admin': {
              target: apiBaseUrl,
              changeOrigin: true,
            },
            '/user': {
              target: apiBaseUrl,
              changeOrigin: true,
            },
            '/health': {
              target: apiBaseUrl,
              changeOrigin: true,
            },
          }
        : undefined,
    },
  }
})
