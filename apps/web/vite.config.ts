import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    exclude: [
      '@duckdb/duckdb-wasm',
      // igv and ngl ship pre-bundled UMD — exclude from Vite's dep optimizer
      'igv',
      'ngl',
    ],
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        // Split large 3D/genome libs into their own chunks
        manualChunks: {
          'vendor-igv': ['igv'],
          'vendor-ngl': ['ngl'],
          'vendor-plotly': ['plotly.js-dist-min'],
          'vendor-echarts': ['echarts'],
        },
      },
    },
  },
})
