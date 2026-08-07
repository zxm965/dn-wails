import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { lstat, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { resolveCOSReleaseConfig } from './cos-release-config.mjs'
import { updateObjectURL } from './update-base-url.mjs'

const maximumAssetSize = 1024 * 1024 * 1024
const assetNames = [
  'dn-wails-darwin-universal.zip',
  'dn-wails-darwin-universal.dmg',
  'dn-wails-windows-amd64-installer.exe',
]

const tag = process.argv[2]?.trim() ?? ''
const repository = process.argv[3]?.trim() ?? ''
const releaseDirectory = resolve(process.argv[4]?.trim() || 'release')
const updateBaseURLInput = process.argv[5]?.trim() ?? ''
const updateBaseURL = updateBaseURLInput
  ? resolveCOSReleaseConfig(updateBaseURLInput, process.argv[6]?.trim() || 'dn-wails').updateBaseURL
  : ''

const versionMatch = tag.match(/^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/)
if (!versionMatch) throw new Error(`Release tag must use vMAJOR.MINOR.PATCH, received: ${tag || '(empty)'}`)
if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
  throw new Error(`Repository must use OWNER/NAME, received: ${repository || '(empty)'}`)
}

const publishedAtInput = process.env.RELEASE_PUBLISHED_AT?.trim() || new Date().toISOString()
const publishedAtDate = new Date(publishedAtInput)
if (Number.isNaN(publishedAtDate.getTime())) throw new Error('RELEASE_PUBLISHED_AT must be a valid date')
const publishedAt = publishedAtDate.toISOString()

const assets = []
for (const name of assetNames) {
  const filePath = resolve(releaseDirectory, name)
  const fileInfo = await lstat(filePath)
  if (!fileInfo.isFile()) throw new Error(`Release asset must be a regular file: ${name}`)
  if (fileInfo.size <= 0 || fileInfo.size > maximumAssetSize) {
    throw new Error(`Release asset has invalid size: ${name}`)
  }

  const hash = createHash('sha256')
  for await (const chunk of createReadStream(filePath)) hash.update(chunk)
  assets.push({
    name,
    url: updateBaseURL
      ? updateObjectURL(updateBaseURL, tag, name)
      : `https://github.com/${repository}/releases/download/${tag}/${encodeURIComponent(name)}`,
    digest: `sha256:${hash.digest('hex')}`,
    size: fileInfo.size,
  })
}

const manifest = {
  schemaVersion: 1,
  repository,
  version: tag.slice(1),
  name: tag,
  notes: '',
  releaseUrl: updateBaseURL ? `${updateObjectURL(updateBaseURL, tag)}/` : `https://github.com/${repository}/releases/tag/${tag}`,
  publishedAt,
  assets,
}

await writeFile(resolve(releaseDirectory, 'latest.json'), `${JSON.stringify(manifest, null, 2)}\n`, {
  encoding: 'utf8',
  mode: 0o644,
})
