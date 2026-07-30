function readDisplayName(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error('.env: APP_DISPLAY_NAME must be a string')
  }

  const displayName = value.trim()
  if (!displayName) {
    throw new Error('.env: APP_DISPLAY_NAME is required')
  }
  if (Array.from(displayName).length > 40) {
    throw new Error('.env: APP_DISPLAY_NAME cannot exceed 40 characters')
  }
  if (Array.from(displayName).some(isControlCharacter)) {
    throw new Error('.env: APP_DISPLAY_NAME cannot contain control characters')
  }

  return displayName
}

function isControlCharacter(character: string): boolean {
  const codePoint = character.codePointAt(0)
  return (
    codePoint !== undefined &&
    (codePoint <= 0x1f || (codePoint >= 0x7f && codePoint <= 0x9f) || codePoint === 0x2028 || codePoint === 0x2029)
  )
}

export const appConfig = Object.freeze({
  displayName: readDisplayName(import.meta.env.APP_DISPLAY_NAME),
})
