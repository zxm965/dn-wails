/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly APP_DISPLAY_NAME: string
  readonly APP_AUTHOR_NAME: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
