import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Needed for Docker
    port: 5173,
    watch: {
      usePolling: true // Enable this if hot-reload isn't working in Docker
    }
  }
})
