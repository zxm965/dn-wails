export function normalizeUpdateBaseURL(input) {
  const value = input?.trim() ?? ''
  if (!value) throw new Error('APP_UPDATE_BASE_URL is required')
  if (value.length > 2048) throw new Error('APP_UPDATE_BASE_URL cannot exceed 2048 characters')

  let parsed
  try {
    parsed = new URL(value)
  } catch {
    throw new Error('APP_UPDATE_BASE_URL must be an absolute HTTPS URL')
  }
  if (parsed.protocol !== 'https:' || !parsed.hostname) {
    throw new Error('APP_UPDATE_BASE_URL must be an absolute HTTPS URL')
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error('APP_UPDATE_BASE_URL cannot contain credentials, query parameters or fragments')
  }

  return parsed.toString().replace(/\/+$/, '')
}

export function updateObjectURL(baseURL, ...pathSegments) {
  const encodedPath = pathSegments.map((segment) => encodeURIComponent(segment)).join('/')
  return new URL(encodedPath, `${normalizeUpdateBaseURL(baseURL)}/`).toString()
}
