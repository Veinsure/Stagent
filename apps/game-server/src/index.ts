import { loadConfig } from "./config.js"
import { createGameServer, listen } from "./server.js"
import { createDbClient } from "./db/client.js"
import { TableRegistry } from "./actors/table-registry.js"
import { abortUnfinishedHands } from "./recovery.js"
import { spawnDumbBotLoopback } from "./dev/dumb-bot-loopback.js"

async function main() {
  const config = loadConfig()
  const { db, close: closeDb } = createDbClient(config.databaseUrl, config.dbSearchPath)
  const registry = new TableRegistry(db)

  // Recovery: abort any hands that didn't finish from last crash
  const aborted = await abortUnfinishedHands(db)
  if (aborted > 0) console.log(`Aborted ${aborted} unfinished hands during recovery`)

  // Load existing tables
  await registry.loadAll()

  const { server, close: closeServer } = createGameServer({ db, registry })
  await listen(server, config.port)
  console.log(`game-server listening on :${config.port}`)

  // Spawn dumb bots if enabled
  if (config.devSpawnBot > 0) {
    console.log(`Spawning ${config.devSpawnBot} dumb bots...`)
    for (let i = 0; i < config.devSpawnBot; i++) {
      spawnDumbBotLoopback({ db, registry, name: `dumb-bot-${i}` }).catch((e) => {
        console.error(`dumb-bot-${i} failed:`, e)
      })
    }
  }

  // Graceful shutdown
  process.on("SIGTERM", async () => {
    console.log("SIGTERM received, shutting down...")
    await closeServer()
    await closeDb()
    process.exit(0)
  })
}

main().catch((e) => { console.error(e); process.exit(1) })
