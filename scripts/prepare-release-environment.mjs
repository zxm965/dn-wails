import { writeFile } from 'node:fs/promises'

import { resolveCOSReleaseConfig } from './cos-release-config.mjs'

const databaseURL = process.env.DATABASE_URL?.trim() ?? ''
if (!databaseURL) throw new Error('DATABASE_URL is required')
if (databaseURL.length > 8192) throw new Error('DATABASE_URL cannot exceed 8192 characters')
if (
  Array.from(databaseURL).some((character) => {
    const codePoint = character.codePointAt(0)
    return (
      codePoint !== undefined &&
      (codePoint <= 0x1f || (codePoint >= 0x7f && codePoint <= 0x9f) || codePoint === 0x2028 || codePoint === 0x2029)
    )
  })
) {
  throw new Error('DATABASE_URL cannot contain control characters')
}

const { updateBaseURL } = resolveCOSReleaseConfig(
  process.env.APP_UPDATE_BASE_URL,
  process.env.TENCENT_COS_PREFIX || 'dn-wails',
)
await writeFile('.env.local', `DATABASE_URL=${databaseURL}\nAPP_UPDATE_BASE_URL=${updateBaseURL}\n`, {
  encoding: 'utf8',
  mode: 0o600,
})
