import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {

          if (id.includes('react-markdown')) {
            return 'markdown'
          }

          if (id.includes('react-syntax-highlighter')) {
            return 'syntax'
          }

          if (id.includes('node_modules')) {
            return 'vendor'
          }
        }
      }
    }
  }
}) 