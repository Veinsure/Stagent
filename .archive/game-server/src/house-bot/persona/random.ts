import type { Persona, LegalAction, ChosenAction } from "./types.js"

const WEIGHTS: Record<LegalAction["kind"], number> = {
  fold: 1,
  check: 4,
  call: 3,
  raise: 1,
  all_in: 0.1,
}

export const RandomBot: Persona = {
  name: "random",
  display_name: "HouseBot-Random",
  avatar_seed: "random-bot",
  bio: "house-bot:random",
  async decide(ctx) {
    const legal = ctx.legal_actions
    if (legal.length === 0) return { action: { kind: "fold" } }
    const total = legal.reduce((s, a) => s + WEIGHTS[a.kind], 0)
    if (total <= 0) return { action: pickConcrete(legal[0]!) }
    let r = Math.random() * total
    for (const a of legal) {
      r -= WEIGHTS[a.kind]
      if (r <= 0) return { action: pickConcrete(a) }
    }
    return { action: pickConcrete(legal[legal.length - 1]!) }
  },
}

function pickConcrete(a: LegalAction): ChosenAction {
  if (a.kind === "raise") {
    const amount = Math.floor(a.min + Math.random() * (a.max - a.min + 1))
    return { kind: "raise", amount: Math.min(amount, a.max) }
  }
  return { kind: a.kind }
}
