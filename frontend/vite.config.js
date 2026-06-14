import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/users': 'http://localhost:8081',
      '/api/lost-found': 'http://localhost:8083',
      '/api/complaints': 'http://localhost:8082',
      '/api/notifications': 'http://localhost:8084'
    }
  }
})
