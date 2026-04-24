import { freshSchema, type FreshSchema } from "./schema.js"
import { createDbClient } from "../../src/db/client.js"
import { createGameServer, listen } from "../../src/server.js"
import { createHandler } from "../../src/mcp/handler.js"
import { TableRegistry } from "../../src/actors/table-registry.js"
import type { Db } from "../../src/db/client.js"

export interface TestServer {
  schema: FreshSchema
  db: Db
  registry: TableRegistry
  wsUrl: string
  cleanup: () => Promise<void>
}

export async function startTestServer(): Promise<TestServer> {
  const schema = await freshSchema()
  const { db, close: closeDb } = createDbClient(schema.databaseUrl, schema.schemaName)
  const registry = new TableRegistry(db)
  await registry.loadAll()
  const { server, close: closeServer } = createGameServer({ db, registry })
  await listen(server, 0)
  const addr = server.address()
  const port = typeof addr === "object" && addr ? addr.port : 0
  return {
    schema, db, registry,
    wsUrl: `ws://localhost:${port}/mcp`,
    cleanup: async () => {
      await closeServer()
      await registry.stopAll()
      await closeDb()
      await schema.cleanup()
    },
  }
}
