import { fileURLToPath, URL } from 'node:url'

import babel from '@rolldown/plugin-babel'
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import wails from '@wailsio/runtime/plugins/vite'
import { defineConfig } from 'vite'

const devServerPort = Number(process.env.WAILS_VITE_PORT ?? 9245)
const projectRoot = fileURLToPath(new URL('..', import.meta.url))

if (!Number.isInteger(devServerPort) || devServerPort < 1 || devServerPort > 65535) {
  throw new Error(`Invalid WAILS_VITE_PORT: ${process.env.WAILS_VITE_PORT}`)
}

// https://vite.dev/config/
export default defineConfig({
  envDir: projectRoot,
  envPrefix: 'APP_',
  plugins: [wails('./bindings'), vanillaExtractPlugin(), react(), babel({ presets: [reactCompilerPreset()] })],
  server: {
    host: '127.0.0.1',
    port: devServerPort,
    strictPort: true,
    ws: {
      host: '127.0.0.1',
      clientPort: devServerPort,
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@bindings': fileURLToPath(new URL('./bindings', import.meta.url)),
    },
  },
})
