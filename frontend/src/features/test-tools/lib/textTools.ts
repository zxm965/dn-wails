export type HashAlgorithm = 'MD5' | 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512'

const MD5_SHIFTS = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4,
  11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
] as const

const MD5_CONSTANTS = Array.from({ length: 64 }, (_, index) => Math.floor(Math.abs(Math.sin(index + 1)) * 0x100000000))

function rotateLeft(value: number, amount: number): number {
  return ((value << amount) | (value >>> (32 - amount))) >>> 0
}

function wordToLittleEndianHex(value: number): string {
  let result = ''
  for (let offset = 0; offset < 32; offset += 8) {
    result += ((value >>> offset) & 0xff).toString(16).padStart(2, '0')
  }
  return result
}

export function md5(input: string): string {
  const bytes = new TextEncoder().encode(input)
  const paddedLength = Math.ceil((bytes.length + 9) / 64) * 64
  const padded = new Uint8Array(paddedLength)
  padded.set(bytes)
  padded[bytes.length] = 0x80

  const bitLength = bytes.length * 8
  const lengthView = new DataView(padded.buffer)
  lengthView.setUint32(paddedLength - 8, bitLength >>> 0, true)
  lengthView.setUint32(paddedLength - 4, Math.floor(bitLength / 0x100000000), true)

  let a0 = 0x67452301
  let b0 = 0xefcdab89
  let c0 = 0x98badcfe
  let d0 = 0x10325476

  for (let offset = 0; offset < paddedLength; offset += 64) {
    const words = new Uint32Array(16)
    for (let index = 0; index < words.length; index += 1) {
      words[index] = lengthView.getUint32(offset + index * 4, true)
    }

    let a = a0
    let b = b0
    let c = c0
    let d = d0

    for (let index = 0; index < 64; index += 1) {
      let mixed: number
      let wordIndex: number

      if (index < 16) {
        mixed = (b & c) | (~b & d)
        wordIndex = index
      } else if (index < 32) {
        mixed = (d & b) | (~d & c)
        wordIndex = (5 * index + 1) % 16
      } else if (index < 48) {
        mixed = b ^ c ^ d
        wordIndex = (3 * index + 5) % 16
      } else {
        mixed = c ^ (b | ~d)
        wordIndex = (7 * index) % 16
      }

      const previousD = d
      d = c
      c = b
      const sum = (a + mixed + MD5_CONSTANTS[index] + words[wordIndex]) >>> 0
      b = (b + rotateLeft(sum, MD5_SHIFTS[index])) >>> 0
      a = previousD
    }

    a0 = (a0 + a) >>> 0
    b0 = (b0 + b) >>> 0
    c0 = (c0 + c) >>> 0
    d0 = (d0 + d) >>> 0
  }

  return [a0, b0, c0, d0].map(wordToLittleEndianHex).join('')
}

export function formatJson(input: string, compact = false): string {
  if (!input.trim()) {
    throw new Error('请输入 JSON 内容。')
  }
  const value: unknown = JSON.parse(input)
  return JSON.stringify(value, null, compact ? 0 : 2)
}

export function encodeBase64(input: string): string {
  const bytes = new TextEncoder().encode(input)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
}

export function decodeBase64(input: string): string {
  let binary: string
  try {
    binary = atob(input.replace(/\s+/g, ''))
  } catch {
    throw new Error('Base64 内容格式不正确。')
  }

  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    throw new Error('Base64 解码结果不是有效的 UTF-8 文本。')
  }
}

export function encodeUrl(input: string): string {
  return encodeURIComponent(input)
}

export function decodeUrl(input: string): string {
  try {
    return decodeURIComponent(input)
  } catch {
    throw new Error('URL 编码内容格式不正确。')
  }
}

export async function calculateHash(input: string, algorithm: HashAlgorithm): Promise<string> {
  if (algorithm === 'MD5') {
    return md5(input)
  }

  if (!globalThis.crypto?.subtle) {
    throw new Error('当前 WebView 不支持 Web Crypto。')
  }

  const digest = await globalThis.crypto.subtle.digest(algorithm, new TextEncoder().encode(input))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}
