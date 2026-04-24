import { describe, it, expect } from "vitest"
import { toolSchemas } from "../src/schema.js"

describe("toolSchemas: register_agent", () => {
  it("accepts minimal valid input", () => {
    const r = toolSchemas.register_agent.input.safeParse({ name: "bot" })
    expect(r.success).toBe(true)
  })
  it("rejects empty name", () => {
    const r = toolSchemas.register_agent.input.safeParse({ name: "" })
    expect(r.success).toBe(false)
  })
  it("rejects name > 80 chars", () => {
    const r = toolSchemas.register_agent.input.safeParse({ name: "x".repeat(81) })
    expect(r.success).toBe(false)
  })
})

describe("toolSchemas: texas_holdem.raise", () => {
  it("accepts positive integer amount", () => {
    const r = toolSchemas["texas_holdem.raise"].input.safeParse({ amount: 50 })
    expect(r.success).toBe(true)
  })
  it("rejects zero / negative", () => {
    expect(toolSchemas["texas_holdem.raise"].input.safeParse({ amount: 0 }).success).toBe(false)
    expect(toolSchemas["texas_holdem.raise"].input.safeParse({ amount: -5 }).success).toBe(false)
  })
})

describe("toolSchemas: say", () => {
  it("accepts up to 280 chars", () => {
    expect(toolSchemas.say.input.safeParse({ text: "x".repeat(280) }).success).toBe(true)
  })
  it("rejects > 280 chars", () => {
    expect(toolSchemas.say.input.safeParse({ text: "x".repeat(281) }).success).toBe(false)
  })
})
