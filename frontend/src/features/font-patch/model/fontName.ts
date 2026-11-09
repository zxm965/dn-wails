interface FontNameSource {
  fontName: string
  sourceName: string
  sha256: string
}

function readable(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= 120 &&
    /[\p{L}\p{N}]/u.test(value) &&
    /^[\p{L}\p{M}\p{N}\p{Zs}_.()[\]'’-]+$/u.test(value)
  )
}

export function getFontDisplayName(result: FontNameSource): string {
  const fontName = result.fontName.trim()
  if (readable(fontName)) return fontName
  const filename = result.sourceName.replace(/\.(ttf|otf)$/i, '').trim()
  if (readable(filename)) return filename
  const identifier = result.sha256.match(/^[a-f0-9]{8}/i)?.[0]
  return identifier ? `font-${identifier}` : 'font'
}
