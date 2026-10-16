import { spawnSync } from 'node:child_process'
import { copyFile, mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const temporary = await mkdtemp(join(tmpdir(), 'cull-pear-build-'))
const plists = ['darwin/Info.plist', 'darwin/Info.dev.plist']
const assets = [...plists, 'windows/info.json', 'windows/wails.exe.manifest', 'windows/nsis/wails_tools.nsh']

try {
  // Wails merges existing plist customizations while updating release metadata.
  for (const path of plists) {
    await mkdir(dirname(join(temporary, path)), { recursive: true })
    await copyFile(join(root, 'build', path), join(temporary, path))
  }
  const result = spawnSync('wails3', [
    'update', 'build-assets', '-name', 'cull-pear', '-binaryname', 'cull-pear',
    '-config', join(root, 'build/config.yml'), '-dir', temporary,
  ], { cwd: root, stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`Wails build metadata generation failed (${result.status ?? result.signal})`)
  // Keep the desktop allowlist explicit; never copy generated task templates or mobile/Linux assets.
  for (const path of assets) await copyFile(join(temporary, path), join(root, 'build', path))
} finally {
  await rm(temporary, { recursive: true, force: true })
}
