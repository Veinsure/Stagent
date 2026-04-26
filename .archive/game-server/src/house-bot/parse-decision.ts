import type { Decision, LegalAction, ChosenAction } from "./persona/types.js"

export function parseDecision(raw: unknown, legal: LegalAction[]): Decision {
  const legalKinds = new Set(legal.map((l) => l.kind))
  const fallback = pickFallback(legal)

  if (!raw || typeof raw !== "object") return { action: fallback }
  const obj = raw as Record<string, unknown>
  const a = obj.action as Record<string, unknown> | undefined
  if (!a || typeof a !== "object" || typeof a.kind !== "string") return { action: fallback }

  let action: ChosenAction
  if (!legalKinds.has(a.kind as LegalAction["kind"])) {
    action = fallback
  } else if (a.kind === "raise") {
    const spec = legal.find((l) => l.kind === "raise") as Extract<LegalAction, { kind: "raise" }>
    const rawAmount = a.amount
    const n = typeof rawAmount === "number" && Number.isFinite(rawAmount) ? Math.floor(rawAmount) : spec.min
    action = { kind: "raise", amount: Math.max(spec.min, Math.min(spec.max, n)) }
  } else {
    action = { kind: a.kind as ChosenAction["kind"] } as ChosenAction
  }

  const think = typeof obj.think === "string" ? obj.think.slice(0, 1000) : undefined
  const say = typeof obj.say === "string" ? obj.say.slice(0, 280) : undefined
  return { action, ...(think ? { think } : {}), ...(say ? { say } : {}) }
}

function pickFallback(legal: LegalAction[]): ChosenAction {
  for (const pref of ["check", "call", "fold"] as const) {
    if (legal.some((l) => l.kind === pref)) return { kind: pref }
  }
  return { kind: "fold" }
}
