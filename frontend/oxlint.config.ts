import { defineConfig } from 'oxlint'

export default defineConfig({
  rules: {
    'no-unused-vars': 'warn',
    'no-undef': 'off',
    'no-var': 'error',
    'no-unused-expressions': 'warn',
    'no-unused-labels': 'warn',
  },
  ignorePatterns: ['node_modules', 'bindings', 'dist'],
})
