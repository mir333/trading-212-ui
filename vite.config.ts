import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api/t212': {
        target: 'https://live.trading212.com/api/v0',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/t212/, ''),
      },
      '/api/t212-demo': {
        target: 'https://demo.trading212.com/api/v0',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/t212-demo/, ''),
      },
      '/api/yahoo': {
        target: 'https://query1.finance.yahoo.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/yahoo/, ''),
      },
    },
  },
})
