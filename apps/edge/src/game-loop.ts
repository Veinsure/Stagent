import { TexasHoldemModule } from "@stagent/texas-holdem"
import type { LegalAction } from "@stagent/texas-holdem"
import type { BroadcastEvent } from "@stagent/shared"
import type { DOState } from "./state.js"
import { BLINDS, STARTING_CHIPS } from "./config.js"
import { decideRandom } from "./random-bot.js"
import { decideLlm, isLlmBot } from "./llm-bot.js"

const REFILL_THRESHOLD = BLINDS.bb * 2

export function refillBankrupt(s: DOState): DOState {
  const seats = s.seats.map((seat) => {
    if ((seat.kind === "bot" || seat.kind === "agent") && seat.chips < REFILL_THRESHOLD) {
      return { ...seat, chips: STARTING_CHIPS }
    }
    return seat
  })
  return { ...s, seats }
}

function seatToAgentId(idx: number, name: string): string {
  return `seat-${idx}-${name}`
}

export function startHand(s: DOState, opts: { seed: string }): DOState {
  const engineSeats = s.seats
    .map((seat, i) => {
      if (seat.kind === "empty") return null
      return { agent_id: seatToAgentId(i, seat.name), chips: seat.chips }
    })
    .filter((x): x is { agent_id: string; chips: number } => x !== null)
  if (engineSeats.length < 2) return s

  const engine = TexasHoldemModule.createTable({
    seats: engineSeats,
    rng_seed: opts.seed,
    blinds: BLINDS,
  })
  return { ...s, engine, handsPlayed: s.handsPlayed + 1 }
}

export function engineSeatToDoSeat(s: DOState, engineIdx: number): number {
  const nonEmpty = s.seats
    .map((seat, i) => ({ seat, i }))
    .filter(({ seat }) => seat.kind !== "empty")
  const entry = nonEmpty[engineIdx]
  if (!entry) throw new Error(`engine seat ${engineIdx} out of range`)
  return entry.i
}

export interface BotStep {
  doIdx: number
  action: { kind: string; amount?: number }
  reasoning: string
}

export function advanceBotsOnly(
  s: DOState,
  rng: () => number,
): { state: DOState; steps: BotStep[]; engineEvents: BroadcastEvent[] } {
  if (!s.engine) return { state: s, steps: [], engineEvents: [] }
  let engine = s.engine
  const steps: BotStep[] = []
  const engineEvents: BroadcastEvent[] = []
  while (engine.street !== "showdown" && engine.to_act !== null) {
    const doIdx = engineSeatToDoSeat(s, engine.to_act)
    const seat = s.seats[doIdx]
    if (!seat || seat.kind === "agent" || seat.kind === "empty") break
    if (seat.kind !== "bot") break

    const engineSeat = engine.seats[engine.to_act]
    if (!engineSeat) break
    const by = engineSeat.agent_id
    const legal: LegalAction[] = TexasHoldemModule.legalActions(engine, by)
    if (legal.length === 0) break
    const decision = decideRandom(legal, rng)
    const result = TexasHoldemModule.applyAction(engine, decision.action, by)
    engine = result.state
    steps.push({
      doIdx,
      action: decision.action.kind === "raise"
        ? { kind: "raise", amount: decision.action.amount }
        : { kind: decision.action.kind },
      reasoning: decision.reasoning,
    })
    engineEvents.push(...result.events)
  }
  return { state: { ...s, engine }, steps, engineEvents }
}

export async function advanceBotsOnce(
  s: DOState,
  rng: () => number,
  anthropicKey?: string,
): Promise<{ state: DOState; step: BotStep | null; engineEvents: BroadcastEvent[] }> {
  if (!s.engine || s.engine.street === "showdown" || s.engine.to_act === null) {
    return { state: s, step: null, engineEvents: [] }
  }
  const engine = s.engine
  const toAct = engine.to_act as number
  const doIdx = engineSeatToDoSeat(s, toAct)
  const seat = s.seats[doIdx]
  if (!seat || seat.kind !== "bot") return { state: s, step: null, engineEvents: [] }

  const engineSeat = engine.seats[toAct]
  if (!engineSeat) return { state: s, step: null, engineEvents: [] }
  const by = engineSeat.agent_id
  const legal: LegalAction[] = TexasHoldemModule.legalActions(engine, by)
  if (legal.length === 0) return { state: s, step: null, engineEvents: [] }

  const persona = anthropicKey ? isLlmBot(seat.name) : null
  const decision = persona
    ? await decideLlm({
        persona,
        street: engine.street,
        holeCards: engineSeat.hole_cards ?? [],
        board: engine.board,
        pot: engine.pot_main,
        toCall: Math.max(0, engine.current_bet - engineSeat.contributed_this_street),
        chips: engineSeat.chips,
        legal,
        apiKey: anthropicKey!,
        rng,
      })
    : decideRandom(legal, rng)

  const result = TexasHoldemModule.applyAction(engine, decision.action, by)
  const step: BotStep = {
    doIdx,
    action: decision.action.kind === "raise"
      ? { kind: "raise", amount: (decision.action as { kind: "raise"; amount: number }).amount }
      : { kind: decision.action.kind },
    reasoning: decision.reasoning,
  }
  return { state: { ...s, engine: result.state }, step, engineEvents: result.events }
}
