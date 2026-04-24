import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { startTestServer, type TestServer } from "./helpers/server.js"
import { tables, hands } from "@stagent/db-schema"
import { eq } from "drizzle-orm"

describe("multi-hand continuity", () => {
  let ts: TestServer
  beforeEach(async () => { ts = await startTestServer() })
  afterEach(async () => { await ts.cleanup() })

  it("hand tables can be loaded", async () => {
    const [t] = await ts.db.insert(tables).values({
      slug: "mh", game_kind: "texas_holdem", status: "live",
      blinds: { sb: 5, bb: 10 }, max_seats: 3,
    }).returning({ id: tables.id })
    await ts.registry.loadAll()
    // Just check that registry has the table
    expect(ts.registry.has(t!.id)).toBe(true)
  }, 40000)
})
