import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // server: {
  //   port: 5173,
  //   proxy: { '/api': 'http://localhost:3001' },
  //   // ../shared (form types) is imported by both apps
  //   fs: { allow: ['..'] },
  // },
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
