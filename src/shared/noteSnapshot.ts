import type { Note } from './types'

function base64UrlEncodeUtf8(text: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(text, 'utf8').toString('base64url')
  }
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64UrlDecodeUtf8(snap: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(snap, 'base64url').toString('utf8')
  }
  const base64 = snap.replace(/-/g, '+').replace(/_/g, '/')
  const pad = base64.length % 4 === 0 ? '' : '='.repeat(4 - (base64.length % 4))
  const binary = atob(base64 + pad)
  const bytes = Uint8Array.from(binary, ch => ch.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

/** Compact note payload embedded in the floating window URL for instant render. */
export function encodeNoteSnapshot(note: Note): string {
  return base64UrlEncodeUtf8(JSON.stringify(note))
}

export function decodeNoteSnapshot(snap: string): Note | null {
  try {
    return JSON.parse(base64UrlDecodeUtf8(snap)) as Note
  } catch {
    return null
  }
}
