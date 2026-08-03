import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const projectRoot = new URL('..', import.meta.url)
const stableVersionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/

async function versionFromGitTag() {
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['describe', '--tags', '--abbrev=0', '--match', 'v[0-9]*.[0-9]*.[0-9]*'],
      { cwd: projectRoot },
    )
    const version = stdout.trim().replace(/^v/, '')
    return stableVersionPattern.test(version) ? version : null
  } catch {
    return null
  }
}

async function versionFromBuildConfig() {
  const config = await readFile(new URL('../build/config.yml', import.meta.url), 'utf8')
  const match = config.match(/^info:\n(?:^[ \t]+.*\n)*?^[ \t]+version:[ \t]*['"]?([^'"\r\n]+)['"]?/m)
  const version = match?.[1]?.trim() ?? ''
  if (!stableVersionPattern.test(version)) {
    throw new Error(`build/config.yml contains an invalid info.version: ${version || '(empty)'}`)
  }
  return version
}

const version = (await versionFromGitTag()) ?? (await versionFromBuildConfig())
process.stdout.write(`${version}-dev`)
