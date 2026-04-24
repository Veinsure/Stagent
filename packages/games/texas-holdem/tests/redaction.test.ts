import { describe, it, expect } from "vitest"
import { redactForViewer, redactForAgent } from "../src/redaction.js"
import { createTable } from "../src/state-init.js"

const s = createTable({
  seats: [
    { agent_id: "a1", chips: 1000 },
    { agent_id: "a2", chips: 1000 },
  ],
  rng_seed: "redact",
  blinds: { sb: 5, bb: 10 },
})

describe("redaction", () => {
  it("viewer sees no hole cards", () => {
    const r = redactForViewer(s)
    for (const seat of r.seats) expect(seat.hole_cards).toBeUndefined()
  })

  it("viewer never sees deck_remaining", () => {
    const r = redactForViewer(s)
    expect(r.deck_remaining).toEqual([])
  })

  it("agent sees only own hole cards", () => {
    const r = redactForAgent(s, "a1")
    expect(r.seats[0]!.hole_cards).toBeDefined()
    expect(r.seats[1]!.hole_cards).toBeUndefined()
  })

  it("redactForAgent never reveals deck_remaining", () => {
    const r = redactForAgent(s, "a1")
    expect(r.deck_remaining).toEqual([])
  })
})
