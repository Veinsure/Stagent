import { describe, it, expect } from "vitest"
import { NAME } from "../src/index.js"

describe("smoke", () => {
  it("exports module name", () => {
    expect(NAME).toBe("texas_holdem")
  })
})
