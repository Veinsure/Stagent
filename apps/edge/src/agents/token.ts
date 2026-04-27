import { sha256 } from "@noble/hashes/sha2.js"
import { bytesToHex } from "@noble/hashes/utils.js"

const PREFIX = "sk_agent_"
const BODY_LEN = 24

export function generateAgentToken(): string {
  const bytes = new Uint8Array(BODY_LEN)
  crypto.getRandomValues(bytes)
  const alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
  let out = ""
  for (const b of bytes) out += alphabet[b % 62]
  return PREFIX + out
}

export function hashAgentToken(token: string): string {
  return bytesToHex(sha256(new TextEncoder().encode(token)))
}

export function isAgentTokenFormat(s: string): boolean {
  return s.startsWith(PREFIX) && s.length === PREFIX.length + BODY_LEN
}
