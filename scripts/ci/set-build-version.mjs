import { readFile, writeFile } from 'node:fs/promises'

const configPath = new URL('../../wails.json', import.meta.url)
const productVersion = process.env.RELEASE_TAG

if (!productVersion) {
  throw new Error('RELEASE_TAG is required')
}

const config = JSON.parse(await readFile(configPath, 'utf8'))
config.info = {
  ...config.info,
  productVersion,
}

await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`)
console.log(`Configured product version ${productVersion}`)
