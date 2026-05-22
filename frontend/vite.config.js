import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react({ include: /\.(jsx|tsx|js|ts)$/ })],
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.(js|jsx|ts|tsx)$/,
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: { '.js': 'jsx' },
    },
  },
  server: {
    port: 3011,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://localhost:5011',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:5011',
        changeOrigin: true
      }
    }
  }
})
