import { TexasHoldemModule } from "@stagent/texas-holdem"
import type { LegalAction } from "@stagent/texas-holdem"
import type { DOState } from "./state.js"
import { BLINDS } from "./config.js"
import { decideRandom } from "./random-bot.js"

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

export function advanceBotsOnly(s: DOState, rng: () => number): DOState {
  if (!s.engine) return s
  let engine = s.engine
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
    const action = decideRandom(legal, rng)
    const result = TexasHoldemModule.applyAction(engine, action, by)
    engine = result.state
  }
  return { ...s, engine }
}
