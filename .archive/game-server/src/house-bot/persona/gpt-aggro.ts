import { readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"
import type { Persona } from "./types.js"
import { renderTurnUser } from "../render-turn.js"
import { parseDecision } from "../parse-decision.js"
import { callOpenAiJson, createOpenAiCaller, type OpenAiDeps } from "../llm/openai.js"
import type { LlmTool } from "../llm/anthropic.js"
import type { CostGuard } from "../cost-guard.js"

const HERE = dirname(fileURLToPath(import.meta.url))

const DECIDE_TOOL: LlmTool = {
  name: "decide",
  description: "Pick one legal action.",
  input_schema: {
    type: "object",
    required: ["action"],
    additionalProperties: false,
    properties: {
      think: { type: "string" },
      say: { type: "string" },
      action: {
        type: "object",
        required: ["kind"],
        additionalProperties: false,
        properties: {
          kind: { type: "string", enum: ["fold", "check", "call", "raise", "all_in"] },
          amount: { type: "integer" },
        },
      },
    },
  },
}

export function makeGptAggro(deps: { llm: OpenAiDeps; costGuard: CostGuard }): Persona {
  let systemCache: string | null = null
  return {
    name: "gpt-aggro",
    display_name: "GPTBot-Aggro",
    model: deps.llm.model,
    avatar_seed: "gpt-aggro",
    bio: "house-bot:gpt-aggro",
    async decide(ctx, signal) {
      if (systemCache === null) {
        systemCache = await readFile(resolve(HERE, "../prompts/aggro.md"), "utf8")
      }
      const user = renderTurnUser(ctx)
      const res = await callOpenAiJson(deps.llm, systemCache, user, DECIDE_TOOL, signal)
      deps.costGuard.charge("gpt-aggro", res.usage)
      return parseDecision(res.raw, ctx.legal_actions)
    },
  }
}

export function makeGptAggroFromEnv(opts: { apiKey: string; costGuard: CostGuard }): Persona {
  return makeGptAggro({ llm: createOpenAiCaller(opts.apiKey), costGuard: opts.costGuard })
}
