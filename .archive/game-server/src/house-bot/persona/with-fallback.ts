import type { Persona } from "./types.js"
import type { CostGuard } from "../cost-guard.js"

export function withFallback(base: Persona, fallback: Persona, guard: CostGuard): Persona {
  return {
    name: base.name,
    display_name: base.display_name,
    ...(base.model ? { model: base.model } : {}),
    avatar_seed: base.avatar_seed,
    bio: base.bio,
    async decide(ctx, signal) {
      if (guard.isOverBudget(base.name)) {
        return fallback.decide(ctx, signal)
      }
      return base.decide(ctx, signal)
    },
  }
}
