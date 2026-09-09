import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        // echarts + zrender and the 1 MB Thailand GeoJSON dominate the bundle. Splitting them
        // out lets the browser cache them separately from app code, which changes far more often.
        manualChunks(id) {
          if (id.includes('node_modules/echarts') || id.includes('node_modules/zrender')) return 'echarts'
          if (id.includes('src/assets/thailand.json')) return 'thailand-geo'
          return undefined
        },
      },
    },
  },
})
