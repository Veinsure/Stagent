import { describe, it, expect } from "vitest"
import { TexasHoldemModule } from "../src/index.js"

describe("TexasHoldemModule", () => {
  it("conforms to GameModule shape", () => {
    expect(TexasHoldemModule.name).toBe("texas_holdem")
    expect(typeof TexasHoldemModule.createTable).toBe("function")
    expect(typeof TexasHoldemModule.applyAction).toBe("function")
    expect(typeof TexasHoldemModule.legalActions).toBe("function")
    expect(typeof TexasHoldemModule.redactForViewer).toBe("function")
    expect(typeof TexasHoldemModule.redactForAgent).toBe("function")
  })

  it("createTable returns a state with active seats", () => {
    const s = TexasHoldemModule.createTable({
      seats: [{ agent_id: "a1", chips: 1000 }, { agent_id: "a2", chips: 1000 }],
      rng_seed: "gm",
    })
    expect(s.seats).toHaveLength(2)
  })
})
