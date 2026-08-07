import { readFile } from 'node:fs/promises'

const candidateTag = process.argv[2]?.trim() ?? ''
const currentManifestPath = process.argv[3]?.trim() ?? ''
const repository = process.argv[4]?.trim() ?? ''
const candidateVersion = parseVersion(candidateTag)
if (!currentManifestPath) throw new Error('Current update manifest path is required')
if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
  throw new Error(`Repository must use OWNER/NAME, received: ${repository || '(empty)'}`)
}

const currentManifest = JSON.parse(await readFile(currentManifestPath, 'utf8'))
if (currentManifest?.schemaVersion !== 1) throw new Error('Current update manifest has an unsupported schema version')
if (currentManifest?.repository !== repository) throw new Error('Current update manifest repository does not match')
const currentVersion = parseVersion(currentManifest?.version)

for (let index = 0; index < candidateVersion.length; index += 1) {
  if (candidateVersion[index] > currentVersion[index]) {
    process.stdout.write('true')
    process.exit(0)
  }
  if (candidateVersion[index] < currentVersion[index]) {
    process.stdout.write('false')
    process.exit(0)
  }
}
process.stdout.write('true')

function parseVersion(input) {
  const value = String(input ?? '').trim().replace(/^v/, '')
  const match = value.match(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/)
  if (!match) throw new Error(`Invalid stable semantic version: ${value || '(empty)'}`)
  return match.slice(1).map((part) => BigInt(part))
}
