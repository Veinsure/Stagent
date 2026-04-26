import type { Db } from "../db/client.js"
import type { TableRegistry } from "../actors/table-registry.js"
import type { HouseBotsConfig } from "../config.js"
import { CostGuard, RATES } from "./cost-guard.js"
import { buildPersonaRegistry } from "./persona/index.js"
import { startSpawner, type SpawnerHandle } from "./spawner.js"

export interface RunnerHandle {
  stop: () => Promise<void>
}

export function startHouseBotRunner(deps: {
  db: Db
  registry: TableRegistry
  config: HouseBotsConfig
}): RunnerHandle {
  const guard = new CostGuard({
    budgetUsd: deps.config.llm_budget_usd_per_persona,
    rates: RATES,
  })
  const personas = buildPersonaRegistry({
    costGuard: guard,
    ...(deps.config.anthropic_api_key ? { anthropicKey: deps.config.anthropic_api_key } : {}),
    ...(deps.config.openai_api_key ? { openaiKey: deps.config.openai_api_key } : {}),
  })

  const targets = deps.config.personas
    .filter((p) => personas[p.name] && p.count > 0)
    .map((p) => ({ persona: p.name, count: p.count }))
  if (targets.length === 0) {
    console.warn(
      "[house-bot] no personas loaded (check HOUSE_BOTS + API keys); runner idle",
    )
  }

  const spawner: SpawnerHandle = startSpawner({
    db: deps.db,
    registry: deps.registry,
    personas,
    targets,
    target_seats_per_table: deps.config.target_seats_per_table,
    idle_pause_ms: deps.config.idle_pause_ms,
  })

  const summary = targets.map((t) => `${t.persona}×${t.count}`).join(", ") || "(none)"
  console.log(`[house-bot] runner started: ${summary}`)

  return {
    stop: async () => {
      await spawner.stop()
    },
  }
}
