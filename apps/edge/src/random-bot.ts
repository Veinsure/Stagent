import type { LegalAction, TexasHoldemAction } from "@stagent/texas-holdem"

export interface BotDecision {
  action: TexasHoldemAction
  reasoning: string
}

export function decideRandom(legal: LegalAction[], rng: () => number): BotDecision {
  if (legal.length === 0) throw new Error("no legal actions")
  const roll = rng()
  const pick = legal[Math.floor(roll * legal.length)]!
  let action: TexasHoldemAction
  switch (pick.kind) {
    case "fold":   action = { kind: "fold" }; break
    case "check":  action = { kind: "check" }; break
    case "call":   action = { kind: "call" }; break
    case "all_in": action = { kind: "all_in" }; break
    case "raise": {
      const span = pick.max - pick.min
      const amount = pick.min + Math.floor(rng() * (span + 1))
      action = { kind: "raise", amount }
      break
    }
  }
  const optionsText = legal.map(l => l.kind).join("/")
  const reasoning =
    `[RandomBot] options=${optionsText}; rolled=${roll.toFixed(3)}; choose=${action.kind}` +
    (action.kind === "raise" ? ` ${action.amount}` : "")
  return { action, reasoning }
}
