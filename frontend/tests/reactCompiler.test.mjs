import assert from 'node:assert/strict'
import { globSync, readFileSync } from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { parseSync, traverse } from '@babel/core'
import { build, normalizePath } from 'vite'

const root = fileURLToPath(new URL('../', import.meta.url))
const targets = new Map([
  ['src/features/calendar/components/CalendarPanel.tsx', 'CalendarPanel'],
  ['src/features/tasks/components/TaskEditorDialog.tsx', 'TaskEditorDialog'],
  ['src/shared/interaction/InteractionProvider.tsx', 'InteractionProvider'],
])

// Exercise the real Vite configuration without starting a server or writing dist.
// Check actual cached work where supported; calendar calculations intentionally
// use ordinary expressions even when the compiler does not cache that call.
test('Vite compiles components that rely on automatic memoization', async () => {
  const compiled = new Set()
  const cachedWork = new Set()
  const result = await build({
    root,
    logLevel: 'silent',
    build: { write: false, minify: false },
    plugins: [
      {
        name: 'verify-react-compiler',
        enforce: 'post',
        transform(code, id) {
          const relativePath = normalizePath(id).slice(normalizePath(root).length)
          const name = targets.get(relativePath)
          if (!name) return

          const ast = parseSync(code, { configFile: false, babelrc: false })
          traverse(ast, {
            FunctionDeclaration(path) {
              if (path.node.id?.name !== name) return
              let cacheName
              path.traverse({
                CallExpression(call) {
                  if (call.getFunctionParent() !== path || call.node.callee.type !== 'Identifier') return
                  const binding = call.scope.getBinding(call.node.callee.name)
                  if (
                    binding?.path.isImportSpecifier() &&
                    binding.path.node.imported.name === 'c' &&
                    binding.path.parent.source.value === 'react/compiler-runtime'
                  ) {
                    compiled.add(name)
                    cacheName = call.parent.id.name
                  }
                },
              })
              function recordCachedWork(expression) {
                const branch = expression.findParent((parent) => parent.isIfStatement())
                if (!branch || !cacheName) return
                branch.get('test').traverse({
                  ReferencedIdentifier(reference) {
                    if (reference.node.name === cacheName) cachedWork.add(name)
                  },
                })
              }
              path.traverse({
                CallExpression(call) {
                  const callee = call.node.callee
                  if (
                    name === 'CalendarPanel' &&
                    callee.type === 'Identifier' &&
                    callee.name === 'buildCalendarMonth'
                  ) {
                    recordCachedWork(call)
                  }
                  if (
                    name === 'TaskEditorDialog' &&
                    callee.type === 'MemberExpression' &&
                    callee.object.name === 'lists' &&
                    callee.property.name === 'map'
                  ) {
                    recordCachedWork(call)
                  }
                },
                ObjectExpression(object) {
                  if (
                    name === 'InteractionProvider' &&
                    ['notify', 'dismiss', 'confirm'].every((key) =>
                      object.node.properties.some((property) => property.key?.name === key),
                    )
                  ) {
                    recordCachedWork(object)
                  }
                },
              })
            },
          })
        },
      },
    ],
  })

  for (const name of targets.values()) {
    assert.ok(compiled.has(name), `${name} must receive its own compiler memo cache`)
    if (name !== 'CalendarPanel') {
      assert.ok(cachedWork.has(name), `${name} must cache its derived value, not just its JSX`)
    }
  }
  const outputs = (Array.isArray(result) ? result : [result]).flatMap((bundle) => bundle.output)
  assert.ok(
    outputs.some((output) => output.type === 'chunk' && output.code.includes('react.memo_cache_sentinel')),
    'The production bundle must include the React Compiler runtime',
  )
})

test('application source does not use manual memoization hooks', () => {
  for (const file of globSync('src/**/*.{ts,tsx}', { cwd: root })) {
    const source = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
    assert.doesNotMatch(source, /\buse(?:Memo|Callback)\b/, file)
  }
})
