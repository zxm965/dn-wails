import { defineConfig } from 'oxfmt'

export default defineConfig({
  semi: false,
  tabWidth: 2,
  printWidth: 120,
  singleQuote: true,
  jsxSingleQuote: true,
  sortImports: true,
  singleAttributePerLine: false,
  trailingComma: 'all',
  ignorePatterns: ['dist', 'wailsjs', 'pnpm-lock.yaml'],
})
