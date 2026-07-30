function readPublicName(value: unknown, key: 'APP_DISPLAY_NAME' | 'APP_AUTHOR_NAME'): string {
  if (typeof value !== 'string') {
    throw new Error(`.env: ${key} must be a string`)
  }

  const name = value.trim()
  if (!name) {
    throw new Error(`.env: ${key} is required`)
  }
  if (Array.from(name).length > 40) {
    throw new Error(`.env: ${key} cannot exceed 40 characters`)
  }
  if (Array.from(name).some(isControlCharacter)) {
    throw new Error(`.env: ${key} cannot contain control characters`)
  }

  return name
}

function isControlCharacter(character: string): boolean {
  const codePoint = character.codePointAt(0)
  return (
    codePoint !== undefined &&
    (codePoint <= 0x1f || (codePoint >= 0x7f && codePoint <= 0x9f) || codePoint === 0x2028 || codePoint === 0x2029)
  )
}

export const appConfig = Object.freeze({
  displayName: readPublicName(import.meta.env.APP_DISPLAY_NAME, 'APP_DISPLAY_NAME'),
  authorName: readPublicName(import.meta.env.APP_AUTHOR_NAME, 'APP_AUTHOR_NAME'),
})
