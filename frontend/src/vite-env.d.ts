/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly APP_DISPLAY_NAME: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
