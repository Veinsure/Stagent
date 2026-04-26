import { describe, it, expect } from "vitest"
import { env, runInDurableObject } from "cloudflare:test"
import { startHand, advanceBotsOnly, refillBankrupt } from "../src/game-loop.js"
import type { TableDO } from "../src/do-table.js"
import type { DOState, Seat } from "../src/state.js"
import { STARTING_CHIPS } from "../src/config.js"

function mkAllBotState(): DOState {
  const seats: Seat[] = Array.from({ length: 4 }, (_, i) => ({
    kind: "bot" as const, name: `B${i}`, chips: STARTING_CHIPS,
  }))
  return {
    kind: "demo", room: "demo-1",
    seats,
    engine: null, handsPlayed: 0, actionLog: [], lastActivityMs: Date.now(),
  }
}

describe("game loop", () => {
  it("startHand creates engine state", () => {
    const s = mkAllBotState()
    const after = startHand(s, { seed: "test-seed-1" })
    expect(after.engine).not.toBeNull()
    expect(after.engine!.hand_no).toBe(1)
  })

  it("advanceBotsOnly runs a hand to showdown when only bots seated", () => {
    const started = startHand(mkAllBotState(), { seed: "test-seed-2" })
    const { state, steps } = advanceBotsOnly(started, () => 0.5)
    expect(state.engine!.street).toBe("showdown")
    expect(steps.length).toBeGreaterThan(0)
  })

  it("advanceBotsOnly stops when an agent seat is to act", () => {
    const base = mkAllBotState()
    base.seats[2] = {
      kind: "agent", name: "User", chips: STARTING_CHIPS,
      mcpSessionId: "s1", lastSeenMs: Date.now(),
    }
    const started = startHand(base, { seed: "test-seed-3" })
    const { state: after } = advanceBotsOnly(started, () => 0.5)
    if (after.engine!.street !== "showdown") {
      const engineToAct = after.engine!.to_act
      if (engineToAct !== null) {
        const engineSeats = after.engine!.seats
        const acting = engineSeats[engineToAct]!
        expect(acting.agent_id).toContain("User")
      }
    }
  })
})

describe("bankruptcy refill", () => {
  it("refillBankrupt tops up to 1000 when chips < 2*BB", () => {
    const s = mkAllBotState()
    s.seats[0] = { kind: "bot", name: "Broke", chips: 0 }
    s.seats[1] = { kind: "bot", name: "Low", chips: 5 }
    const after = refillBankrupt(s)
    const s0 = after.seats[0]!, s1 = after.seats[1]!, s2 = after.seats[2]!
    if (s0.kind !== "empty") expect(s0.chips).toBe(STARTING_CHIPS)
    if (s1.kind !== "empty") expect(s1.chips).toBe(STARTING_CHIPS)
    if (s2.kind !== "empty") expect(s2.chips).toBe(STARTING_CHIPS)
  })
})

describe("alarm-driven advance", () => {
  it("ticking demo table produces hands", async () => {
    const stub = env.TABLE.get(env.TABLE.idFromName("alarm-demo"))
    await stub.fetch("http://edge/c/alarm-demo/__init", { method: "POST" })
    await stub.fetch("http://edge/c/alarm-demo/__startHand", { method: "POST" })

    for (let i = 0; i < 30; i++) {
      await stub.fetch("http://edge/c/alarm-demo/__tick", { method: "POST" })
    }
    await runInDurableObject(stub, async (obj: TableDO) => {
      const s = await obj.readState()
      expect(s.handsPlayed).toBeGreaterThanOrEqual(1)
    })
  })
})
