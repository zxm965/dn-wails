export function missingPreviewCharacters(text: string, supported: ReadonlySet<number>): string {
  return [
    ...new Set([...text].filter((character) => !/\s/u.test(character) && !supported.has(character.codePointAt(0)!))),
  ].join('')
}

export function coveragePercent(covered: number, total: number): string {
  if (total <= 0) return '0.00'
  // Do not round a nearly complete font up to 100% while characters are missing.
  return (Math.floor((covered * 10000) / total) / 100).toFixed(2)
}
