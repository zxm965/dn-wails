import { readFile, writeFile } from 'node:fs/promises'

const rawVersion = process.argv[2]?.trim() ?? ''
const version = rawVersion.startsWith('v') ? rawVersion.slice(1) : rawVersion

if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) {
  throw new Error(`Release tag must use vMAJOR.MINOR.PATCH, received: ${rawVersion || '(empty)'}`)
}

const configPath = new URL('../build/config.yml', import.meta.url)
const config = await readFile(configPath, 'utf8')
const versionPattern = /(^info:\n(?:^[ \t]+.*\n)*?^[ \t]+version:[ \t]*)(['"]?)[^'"\r\n]+\2([ \t]*(?:#.*)?$)/m

if (!versionPattern.test(config)) {
  throw new Error('build/config.yml is missing info.version')
}

await writeFile(configPath, config.replace(versionPattern, `$1'${version}'$3`))
