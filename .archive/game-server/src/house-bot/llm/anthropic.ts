import Anthropic from "@anthropic-ai/sdk"
import type { Usage } from "../cost-guard.js"

export interface LlmTool {
  name: string
  description: string
  input_schema: Record<string, unknown>
}

export interface LlmResult {
  raw: unknown
  usage: Usage
  latency_ms: number
}

export interface AnthropicDeps {
  client: {
    messages: {
      create: (args: Record<string, unknown>, opts?: Record<string, unknown>) => Promise<{
        content: Array<{ type: string; input?: unknown }>
        usage: { input_tokens: number; output_tokens: number }
      }>
    }
  }
  model: string
}

export function createAnthropicCaller(apiKey: string, model = "claude-opus-4-7"): AnthropicDeps {
  const client = new Anthropic({ apiKey })
  return { client: client as unknown as AnthropicDeps["client"], model }
}

export async function callAnthropicTool(
  deps: AnthropicDeps,
  system: string,
  user: string,
  tool: LlmTool,
  signal: AbortSignal,
): Promise<LlmResult> {
  const start = performance.now()
  let lastErr: unknown
  for (const wait of [0, 200, 600]) {
    if (signal.aborted) throw new Error("aborted")
    if (wait) await sleep(wait, signal)
    try {
      const res = await deps.client.messages.create(
        {
          model: deps.model,
          system,
          messages: [{ role: "user", content: user }],
          tools: [tool as unknown as Record<string, unknown>],
          tool_choice: { type: "tool", name: tool.name },
          max_tokens: 800,
        },
        { signal },
      )
      const block = res.content.find((b) => b.type === "tool_use")
      if (!block || block.input === undefined) throw new Error("no_tool_use_block")
      return {
        raw: block.input,
        usage: {
          input_tokens: res.usage.input_tokens,
          output_tokens: res.usage.output_tokens,
        },
        latency_ms: performance.now() - start,
      }
    } catch (e) {
      lastErr = e
      if (signal.aborted) throw e
      if (!isRetryable(e)) break
    }
  }
  throw new Error(`anthropic_retries_exhausted: ${(lastErr as Error)?.message ?? "unknown"}`)
}

function isRetryable(e: unknown): boolean {
  const s = String((e as Error)?.message ?? "")
  return /429|5\d\d|timeout|ECONN|fetch failed/i.test(s)
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms)
    const onAbort = () => {
      clearTimeout(t)
      reject(new Error("aborted"))
    }
    signal.addEventListener("abort", onAbort, { once: true })
  })
}
