import { normalizeUpdateBaseURL, updateObjectURL } from './update-base-url.mjs'

const cosOriginPattern = /^([a-z0-9][a-z0-9-]*-[0-9]+)\.cos\.([a-z0-9-]+)\.myqcloud\.com$/
const prefixPartPattern = /^[A-Za-z0-9._-]+$/

export function resolveCOSReleaseConfig(originInput, prefixInput = 'dn-wails') {
  const origin = normalizeUpdateBaseURL(originInput)
  const parsedOrigin = new URL(origin)
  if (parsedOrigin.pathname !== '/') {
    throw new Error('APP_UPDATE_BASE_URL must contain only the Tencent Cloud COS origin without an object path')
  }

  const originMatch = parsedOrigin.hostname.match(cosOriginPattern)
  if (!originMatch) {
    throw new Error('APP_UPDATE_BASE_URL must use the standard <BucketName-APPID>.cos.<Region>.myqcloud.com host')
  }

  const prefix = String(prefixInput ?? '')
    .trim()
    .replace(/^\/+|\/+$/g, '')
  if (!prefix) throw new Error('TENCENT_COS_PREFIX cannot be empty')
  const prefixParts = prefix.split('/')
  if (prefixParts.some((part) => part === '.' || part === '..' || !prefixPartPattern.test(part))) {
    throw new Error('TENCENT_COS_PREFIX contains an invalid path segment')
  }

  return {
    bucket: originMatch[1],
    region: originMatch[2],
    prefix: prefixParts.join('/'),
    updateBaseURL: updateObjectURL(origin, ...prefixParts).replace(/\/+$/, ''),
  }
}
