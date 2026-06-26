import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      external: ['react-native-fs'],
    },
  },
  server: {
    host: true, // Needed for Docker
    port: 5173,
    watch: {
      usePolling: true // Enable this if hot-reload isn't working in Docker
    },
    proxy: {
      '/api': {
        target: 'http://localhost:9000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:9000',
        changeOrigin: true,
      }
    }
  }
})
