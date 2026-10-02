import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

/**
 * Long-lived vendor chunks: they change far less often than our pages, so
 * they stay cached across deploys. Pages themselves are split by React.lazy.
 *
 * recharts is deliberately NOT listed: grouping it here made the entry import
 * a shared CommonJS helper from that chunk, so every page preloaded ~420 kB of
 * charts. Left to Rollup, it ships with Dashboard/Analytics only.
 */
const VENDOR_CHUNKS: Array<[name: string, pattern: RegExp]> = [
  ['react', /[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler|@remix-run)[\\/]/],
  ['radix', /[\\/]node_modules[\\/](@radix-ui|@floating-ui|react-remove-scroll[^\\/]*|aria-hidden|react-style-singleton|use-callback-ref|use-sidecar)[\\/]/],
  ['query', /[\\/]node_modules[\\/]@tanstack[\\/]/],
  ['motion', /[\\/]node_modules[\\/](framer-motion|motion-dom|motion-utils)[\\/]/],
  ['sentry', /[\\/]node_modules[\\/]@sentry(-internal)?[\\/]/],
]

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          return VENDOR_CHUNKS.find(([, pattern]) => pattern.test(id))?.[0]
        },
      },
    },
  },
  server: {
    port: 3002,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
