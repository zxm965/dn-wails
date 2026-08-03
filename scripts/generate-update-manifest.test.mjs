import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'

const scriptPath = fileURLToPath(new URL('./generate-update-manifest.mjs', import.meta.url))
const assets = {
  'dn-wails-darwin-universal.dmg': 'dmg',
  'dn-wails-darwin-universal.zip': 'zip',
  'dn-wails-windows-amd64-installer.exe': 'exe',
}

test('generates a deterministic release manifest', async (context) => {
  const directory = await mkdtemp(join(tmpdir(), 'dn-wails-manifest-'))
  context.after(() => rm(directory, { recursive: true, force: true }))
  for (const [name, value] of Object.entries(assets)) await writeFile(join(directory, name), value)

  const result = spawnSync(process.execPath, [scriptPath, 'v1.2.3', 'zxm965/dn-wails', directory], {
    encoding: 'utf8',
    env: { ...process.env, RELEASE_PUBLISHED_AT: '2026-08-03T02:00:00Z' },
  })
  assert.equal(result.status, 0, result.stderr)

  const manifest = JSON.parse(await readFile(join(directory, 'latest.json'), 'utf8'))
  assert.equal(manifest.schemaVersion, 1)
  assert.equal(manifest.repository, 'zxm965/dn-wails')
  assert.equal(manifest.version, '1.2.3')
  assert.equal(manifest.publishedAt, '2026-08-03T02:00:00.000Z')
  assert.equal(manifest.assets.length, 3)
  for (const asset of manifest.assets) {
    assert.equal(asset.size, Buffer.byteLength(assets[asset.name]))
    assert.equal(asset.digest, `sha256:${createHash('sha256').update(assets[asset.name]).digest('hex')}`)
    assert.equal(asset.url, `https://github.com/zxm965/dn-wails/releases/download/v1.2.3/${asset.name}`)
  }
})

test('rejects invalid tags and missing assets', async (context) => {
  const directory = await mkdtemp(join(tmpdir(), 'dn-wails-manifest-'))
  context.after(() => rm(directory, { recursive: true, force: true }))

  const invalidTag = spawnSync(process.execPath, [scriptPath, 'latest', 'zxm965/dn-wails', directory])
  assert.notEqual(invalidTag.status, 0)

  const missingAssets = spawnSync(process.execPath, [scriptPath, 'v1.2.3', 'zxm965/dn-wails', directory])
  assert.notEqual(missingAssets.status, 0)
})
