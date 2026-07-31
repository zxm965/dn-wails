import { fileURLToPath, URL } from 'node:url'

import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const devServerPort = 2233
const projectRoot = fileURLToPath(new URL('..', import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  envDir: projectRoot,
  envPrefix: 'APP_',
  plugins: [vanillaExtractPlugin(), react()],
  server: {
    port: devServerPort,
    strictPort: true,
    ws: {
      host: 'localhost',
      clientPort: devServerPort,
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@wails': fileURLToPath(new URL('./wailsjs', import.meta.url)),
    },
  },
})
