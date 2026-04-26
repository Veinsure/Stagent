import OpenAI from "openai"
import type { LlmResult, LlmTool } from "./anthropic.js"

export interface OpenAiDeps {
  client: {
    chat: {
      completions: {
        create: (args: Record<string, unknown>, opts?: Record<string, unknown>) => Promise<{
          choices: Array<{ message: { content: string | null } }>
          usage?: { prompt_tokens?: number; completion_tokens?: number }
        }>
      }
    }
  }
  model: string
}

export function createOpenAiCaller(apiKey: string, model = "gpt-4o"): OpenAiDeps {
  const client = new OpenAI({ apiKey })
  return { client: client as unknown as OpenAiDeps["client"], model }
}

export async function callOpenAiJson(
  deps: OpenAiDeps,
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
      const res = await deps.client.chat.completions.create(
        {
          model: deps.model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: tool.name,
              schema: tool.input_schema,
              strict: false,
            },
          },
          max_tokens: 800,
        },
        { signal },
      )
      const msg = res.choices[0]?.message?.content
      if (!msg) throw new Error("no_content")
      return {
        raw: JSON.parse(msg),
        usage: {
          input_tokens: res.usage?.prompt_tokens ?? 0,
          output_tokens: res.usage?.completion_tokens ?? 0,
        },
        latency_ms: performance.now() - start,
      }
    } catch (e) {
      lastErr = e
      if (signal.aborted) throw e
      if (!isRetryable(e)) break
    }
  }
  throw new Error(`openai_retries_exhausted: ${(lastErr as Error)?.message ?? "unknown"}`)
}

function isRetryable(e: unknown): boolean {
  const s = String((e as Error)?.message ?? "")
  return /429|5\d\d|timeout|ECONN|fetch failed/i.test(s)
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms)
    signal.addEventListener("abort", () => {
      clearTimeout(t)
      reject(new Error("aborted"))
    }, { once: true })
  })
}
