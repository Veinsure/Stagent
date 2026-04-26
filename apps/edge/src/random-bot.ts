import type { LegalAction, TexasHoldemAction } from "@stagent/texas-holdem"

export function decideRandom(legal: LegalAction[], rng: () => number): TexasHoldemAction {
  if (legal.length === 0) throw new Error("no legal actions")
  const pick = legal[Math.floor(rng() * legal.length)]!
  switch (pick.kind) {
    case "fold": return { kind: "fold" }
    case "check": return { kind: "check" }
    case "call": return { kind: "call" }
    case "all_in": return { kind: "all_in" }
    case "raise": {
      const span = pick.max - pick.min
      const amount = pick.min + Math.floor(rng() * (span + 1))
      return { kind: "raise", amount }
    }
  }
}
