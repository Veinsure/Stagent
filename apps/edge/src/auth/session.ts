import { sha256 } from "@noble/hashes/sha2.js"
import { bytesToHex } from "@noble/hashes/utils.js"

export const SESSION_COOKIE = "stg_sid"
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

export function generateSessionToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return base64url(bytes)
}

export function hashSessionToken(token: string): string {
  return bytesToHex(sha256(new TextEncoder().encode(token)))
}

export function serializeSessionCookie(
  token: string,
  opts: { maxAgeSec: number },
): string {
  return [
    `${SESSION_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${opts.maxAgeSec}`,
  ].join("; ")
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
}

export function parseSessionCookie(headers: Headers): string | null {
  const raw = headers.get("Cookie")
  if (!raw) return null
  for (const part of raw.split(";")) {
    const [k, ...rest] = part.trim().split("=")
    if (k === SESSION_COOKIE) return rest.join("=")
  }
  return null
}

function base64url(bytes: Uint8Array): string {
  let s = ""
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}
