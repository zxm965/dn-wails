import { openSync, closeSync, readSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const [platform, architecture, development] = process.argv.slice(2)
if (development !== 'true') {
  const name = `${platform}-${architecture}.zip`
  const path = fileURLToPath(new URL(`../internal/platform/fontpatch/runtime/${name}`, import.meta.url))
  try {
    if (statSync(path).size < 1024) throw new Error('empty runtime')
    const handle = openSync(path, 'r')
    try {
      const signature = Buffer.alloc(4)
      readSync(handle, signature, 0, 4, 0)
      if (!signature.equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))) throw new Error('invalid ZIP')
    } finally {
      closeSync(handle)
    }
  } catch {
    console.error(`Standalone font runtime ${name} is missing. Build it with scripts/build-font-patch.py on the target platform, or use the matching CI artifact before packaging.`)
    process.exitCode = 1
  }
}
