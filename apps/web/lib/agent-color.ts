// Per-agent color derived deterministically from name. Reuses identicon hue
// palette so the avatar and the speech bubbles share the same color identity.

const HUES = [264, 14, 32, 150, 200, 290, 330, 80, 40, 220]

function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function nameToHue(name: string): number {
  return HUES[hashStr(name || "anon") % HUES.length]!
}

export interface AgentTheme {
  hue: number
  ring: string        // border / ring color, vivid
  bubbleBg: string    // tinted bubble background
  bubbleBorder: string
  textOnTint: string  // readable on bubbleBg
  chipAccent: string  // for chip rim accents if needed
}

export function agentTheme(name: string): AgentTheme {
  const hue = nameToHue(name)
  return {
    hue,
    ring: `hsl(${hue} 70% 55%)`,
    bubbleBg: `hsl(${hue} 55% 18% / 0.55)`,
    bubbleBorder: `hsl(${hue} 70% 45%)`,
    textOnTint: `hsl(${hue} 90% 88%)`,
    chipAccent: `hsl(${hue} 80% 60%)`,
  }
}
