import type { AnthropicDeps } from "./anthropic.js"
import type { OpenAiDeps } from "./openai.js"

export interface ScriptStep {
  raw: unknown
  usage?: { input_tokens?: number; output_tokens?: number }
}

export function createMockAnthropic(script: ScriptStep[]): AnthropicDeps {
  let i = 0
  return {
    model: "mock",
    client: {
      messages: {
        create: async () => {
          const step = script[Math.min(i++, script.length - 1)]!
          const usage = step.usage ?? { input_tokens: 50, output_tokens: 20 }
          return {
            content: [{ type: "tool_use", input: step.raw }],
            usage: {
              input_tokens: usage.input_tokens ?? 50,
              output_tokens: usage.output_tokens ?? 20,
            },
          }
        },
      },
    },
  }
}

export function createMockOpenAi(script: ScriptStep[]): OpenAiDeps {
  let i = 0
  return {
    model: "mock-gpt",
    client: {
      chat: {
        completions: {
          create: async () => {
            const step = script[Math.min(i++, script.length - 1)]!
            const usage = step.usage ?? { input_tokens: 40, output_tokens: 18 }
            return {
              choices: [{ message: { content: JSON.stringify(step.raw) } }],
              usage: {
                prompt_tokens: usage.input_tokens ?? 40,
                completion_tokens: usage.output_tokens ?? 18,
              },
            }
          },
        },
      },
    },
  }
}
