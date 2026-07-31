import { readFile, writeFile } from 'node:fs/promises'

const rawVersion = process.argv[2]?.trim() ?? ''
const version = rawVersion.startsWith('v') ? rawVersion.slice(1) : rawVersion

if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) {
  throw new Error(`Release tag must use vMAJOR.MINOR.PATCH, received: ${rawVersion || '(empty)'}`)
}

const configPath = new URL('../wails.json', import.meta.url)
const config = JSON.parse(await readFile(configPath, 'utf8'))
config.info = {
  ...config.info,
  productVersion: version,
}
await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`)
