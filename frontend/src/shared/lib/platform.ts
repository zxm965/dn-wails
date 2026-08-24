export function isMacOS(): boolean {
  return navigator.userAgent.includes('Macintosh')
}

export function isWindows(): boolean {
  return navigator.userAgent.includes('Windows')
}
