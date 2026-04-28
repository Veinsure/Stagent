import type { LegalAction } from "@stagent/texas-holdem"
import type { BotDecision } from "./random-bot.js"
import { decideRandom } from "./random-bot.js"

export type LlmPersona = "aggressive" | "tight"

function fmtCard(c: { rank: string; suit: string }): string {
  return `${c.rank}${c.suit}`
}

function fmtCards(cards: Array<{ rank: string; suit: string }> | undefined): string {
  if (!cards || cards.length === 0) return "(none)"
  return cards.map(fmtCard).join(" ")
}

function buildPrompt(opts: {
  persona: LlmPersona
  street: string
  holeCards: Array<{ rank: string; suit: string }>
  board: Array<{ rank: string; suit: string }>
  pot: number
  toCall: number
  chips: number
  legal: LegalAction[]
}): { system: string; user: string } {
  const { persona, street, holeCards, board, pot, toCall, chips, legal } = opts

  const systemMap: Record<LlmPersona, string> = {
    aggressive:
      "You are an aggressive Texas Hold'em bot. Prefer raising and applying pressure. " +
      "Fold only with very weak holdings. Bluff occasionally.",
    tight:
      "You are a tight Texas Hold'em bot. Only continue with strong hands. " +
      "Fold marginal hands readily. When you do bet, bet for value.",
  }

  const legalStr = legal
    .map((a) => {
      if (a.kind === "raise") return `raise(min:${a.min},max:${a.max})`
      return a.kind
    })
    .join(", ")

  const user = [
    `Street: ${street}`,
    `Your hole cards: ${fmtCards(holeCards)}`,
    `Board: ${fmtCards(board)}`,
    `Pot: ${pot} chips | Your stack: ${chips} chips | To call: ${toCall} chips`,
    `Legal actions: ${legalStr}`,
    ``,
    `Reply with ONLY valid JSON on one line:`,
    `{"action":"<one of the legal action names>","amount":<integer, only for raise>,"reasoning":"<1-2 sentences>"}`,
  ].join("\n")

  return { system: systemMap[persona] + " Respond ONLY with JSON.", user }
}

export async function decideLlm(opts: {
  persona: LlmPersona
  street: string
  holeCards: Array<{ rank: string; suit: string }>
  board: Array<{ rank: string; suit: string }>
  pot: number
  toCall: number
  chips: number
  legal: LegalAction[]
  apiKey: string
  rng: () => number
}): Promise<BotDecision> {
  const { apiKey, legal, rng } = opts
  const { system, user } = buildPrompt(opts)

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        system,
        messages: [{ role: "user", content: user }],
      }),
    })

    if (!res.ok) throw new Error(`Anthropic ${res.status}`)

    const data = await res.json<{ content?: Array<{ text?: string }> }>()
    const text = data.content?.[0]?.text ?? ""
    const match = text.match(/\{[\s\S]*?\}/)
    if (!match) throw new Error("no JSON in response")

    const parsed = JSON.parse(match[0]) as { action?: string; amount?: number; reasoning?: string }
    const actionKind = parsed.action
    const legalKinds = legal.map((a) => a.kind)
    if (!actionKind || !legalKinds.includes(actionKind as any)) {
      throw new Error(`illegal action: ${actionKind}`)
    }

    let action: import("@stagent/texas-holdem").TexasHoldemAction
    if (actionKind === "raise") {
      const raiseSpec = legal.find((a) => a.kind === "raise") as { kind: "raise"; min: number; max: number }
      const raw = typeof parsed.amount === "number" ? parsed.amount : raiseSpec.min
      const amount = Math.min(Math.max(Math.round(raw), raiseSpec.min), raiseSpec.max)
      action = { kind: "raise", amount }
    } else if (actionKind === "fold") {
      action = { kind: "fold" }
    } else if (actionKind === "check") {
      action = { kind: "check" }
    } else if (actionKind === "call") {
      action = { kind: "call" }
    } else {
      action = { kind: "all_in" }
    }

    return {
      action,
      reasoning: `[${opts.persona === "aggressive" ? "Aggressor" : "TightBot"}] ${parsed.reasoning ?? actionKind}`,
    }
  } catch {
    // Fallback to random on any API / parse error
    return decideRandom(legal, rng)
  }
}

export function isLlmBot(name: string): LlmPersona | null {
  if (name.startsWith("AggressiveBot")) return "aggressive"
  if (name.startsWith("TightBot")) return "tight"
  return null
}
