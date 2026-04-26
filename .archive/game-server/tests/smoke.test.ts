import { describe, it, expect } from "vitest"
import { startTestServer } from "./helpers/server.js"

describe("game-server smoke", () => {
  it("starts and responds to /health", async () => {
    const ts = await startTestServer()
    const port = parseInt(ts.wsUrl.split(":")[2]!.split("/")[0]!, 10)
    const res = await fetch(`http://localhost:${port}/health`)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe("ok")
    await ts.cleanup()
  })
})
