import { readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"
import type { Persona } from "./types.js"
import { renderTurnUser } from "../render-turn.js"
import { parseDecision } from "../parse-decision.js"
import {
  callAnthropicTool,
  createAnthropicCaller,
  type AnthropicDeps,
  type LlmTool,
} from "../llm/anthropic.js"
import type { CostGuard } from "../cost-guard.js"

const HERE = dirname(fileURLToPath(import.meta.url))

const DECIDE_TOOL: LlmTool = {
  name: "decide",
  description: "Pick one legal action, optionally with think/say.",
  input_schema: {
    type: "object",
    required: ["action"],
    properties: {
      think: { type: "string", maxLength: 1200 },
      say: { type: "string", maxLength: 320 },
      action: {
        oneOf: [
          { type: "object", required: ["kind"], properties: { kind: { const: "fold" } } },
          { type: "object", required: ["kind"], properties: { kind: { const: "check" } } },
          { type: "object", required: ["kind"], properties: { kind: { const: "call" } } },
          {
            type: "object",
            required: ["kind", "amount"],
            properties: { kind: { const: "raise" }, amount: { type: "integer" } },
          },
          { type: "object", required: ["kind"], properties: { kind: { const: "all_in" } } },
        ],
      },
    },
  },
}

export function makeClaudeTight(deps: { llm: AnthropicDeps; costGuard: CostGuard }): Persona {
  let systemCache: string | null = null
  return {
    name: "claude-tight",
    display_name: "ClaudeBot-Tight",
    model: deps.llm.model,
    avatar_seed: "claude-tight",
    bio: "house-bot:claude-tight",
    async decide(ctx, signal) {
      if (systemCache === null) {
        systemCache = await readFile(resolve(HERE, "../prompts/tight.md"), "utf8")
      }
      const user = renderTurnUser(ctx)
      const res = await callAnthropicTool(deps.llm, systemCache, user, DECIDE_TOOL, signal)
      deps.costGuard.charge("claude-tight", res.usage)
      return parseDecision(res.raw, ctx.legal_actions)
    },
  }
}

export function makeClaudeTightFromEnv(opts: { apiKey: string; costGuard: CostGuard }): Persona {
  return makeClaudeTight({ llm: createAnthropicCaller(opts.apiKey), costGuard: opts.costGuard })
}
