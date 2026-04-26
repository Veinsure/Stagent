import { RandomBot } from "./random.js"
import { makeClaudeTightFromEnv } from "./claude-tight.js"
import { makeGptAggroFromEnv } from "./gpt-aggro.js"
import { withFallback } from "./with-fallback.js"
import type { Persona } from "./types.js"
import type { CostGuard } from "../cost-guard.js"

export { RandomBot }
export type { Persona }

export interface PersonaDeps {
  costGuard: CostGuard
  anthropicKey?: string
  openaiKey?: string
}

export function buildPersonaRegistry(deps: PersonaDeps): Record<string, Persona> {
  const out: Record<string, Persona> = { random: RandomBot }
  if (deps.anthropicKey) {
    const base = makeClaudeTightFromEnv({
      apiKey: deps.anthropicKey,
      costGuard: deps.costGuard,
    })
    out["claude-tight"] = withFallback(base, RandomBot, deps.costGuard)
  }
  if (deps.openaiKey) {
    const base = makeGptAggroFromEnv({
      apiKey: deps.openaiKey,
      costGuard: deps.costGuard,
    })
    out["gpt-aggro"] = withFallback(base, RandomBot, deps.costGuard)
  }
  return out
}
