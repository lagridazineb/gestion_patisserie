import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  },
  build: {
    // Pas de sourcemaps en prod : évite d'exposer le code source original (non minifié)
    // dans les DevTools de n'importe quel visiteur.
    sourcemap: false,
    minify: 'esbuild',
  },
  esbuild: {
    // Retire console.log / debugger du bundle de production (moins d'infos exposées, bundle plus léger).
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  },
})