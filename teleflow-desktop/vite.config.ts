import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig } from 'vite'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main.ts',
        onstart(options) {
          options.startup()
        },
        vite: {
          build: {
            outDir: 'dist-electron/main',
            rollupOptions: {
              external: [
                'electron',
                'playwright',
                'playwright-core',
                'chromium-bidi',
                'chromium-bidi/lib/cjs/bidiMapper/BidiMapper',
                'chromium-bidi/lib/cjs/cdp/CdpConnection',
                'chromium-bidi/lib/cjs/index.js',
                'chromium-bidi/lib/cjs/bidiMapper/index.js'
              ]
            }
          }
        }
      },
      {
        entry: 'electron/preload.ts',
        onstart(options) {
          options.reload()
        },
        vite: {
          build: {
            outDir: 'dist-electron/preload',
            rollupOptions: {
              external: ['electron']
            }
          }
        }
      }
    ]),
    renderer()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5173
  }
})
