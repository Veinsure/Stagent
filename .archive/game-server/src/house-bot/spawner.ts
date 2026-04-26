import { tables, tableSeats, agents as agentsTable } from "@stagent/db-schema"
import { eq } from "drizzle-orm"
import type { Db } from "../db/client.js"
import type { TableRegistry } from "../actors/table-registry.js"
import type { Persona } from "./persona/types.js"
import { startWorker, type WorkerHandle } from "./worker.js"

export interface SpawnerDeps {
  db: Db
  registry: TableRegistry
  personas: Record<string, Persona>
  targets: Array<{ persona: string; count: number }>
  target_seats_per_table: number
  idle_pause_ms: number
  rescan_interval_ms?: number
}

export interface SpawnerHandle {
  stop: () => Promise<void>
}

export function startSpawner(deps: SpawnerDeps): SpawnerHandle {
  const workers: WorkerHandle[] = []
  let stopped = false

  async function scanAndFill() {
    if (stopped) return
    const liveTables = await deps.db.select().from(tables).where(eq(tables.status, "live"))
    for (const t of liveTables) {
      if (stopped) return
      const seated = await deps.db
        .select({ persona: agentsTable.persona })
        .from(tableSeats)
        .leftJoin(agentsTable, eq(agentsTable.id, tableSeats.agent_id))
        .where(eq(tableSeats.table_id, t.id))
      const seatedCount = seated.length
      const targetFill = Math.min(deps.target_seats_per_table, t.max_seats)
      let deficit = targetFill - seatedCount
      if (deficit <= 0) continue

      for (const tgt of deps.targets) {
        if (stopped || deficit <= 0) break
        const persona = deps.personas[tgt.persona]
        if (!persona) continue
        const hbOfPersona = seated.filter((s) => s.persona === persona.bio).length
        const room = Math.min(deficit, tgt.count - hbOfPersona)
        for (let i = 0; i < room; i++) {
          if (stopped) return
          const w = startWorker({
            db: deps.db,
            registry: deps.registry,
            persona,
            tableId: t.id,
            idlePauseMs: deps.idle_pause_ms,
          })
          workers.push(w)
          deficit--
        }
      }
    }
  }

  const intervalMs = deps.rescan_interval_ms ?? 30_000
  const interval = setInterval(() => {
    scanAndFill().catch((e) => console.error("[house-bot:spawner] scan failed:", e))
  }, intervalMs)
  scanAndFill().catch((e) => console.error("[house-bot:spawner] initial scan failed:", e))

  return {
    stop: async () => {
      stopped = true
      clearInterval(interval)
      for (const w of workers) w.stop()
      await Promise.allSettled(workers.map((w) => w.promise))
    },
  }
}
