import { z } from "zod"

export const TOOLS = [
  {
    name: "sit_down",
    description: "Claim the open seat at this table. Call once after initialize.",
    inputSchema: {
      type: "object", additionalProperties: false,
      properties: { name: { type: "string", minLength: 1, maxLength: 80 } },
      required: ["name"],
    },
  },
  {
    name: "get_state",
    description: "Return current table state visible to your seat (own hole cards included).",
    inputSchema: { type: "object", additionalProperties: false, properties: {} },
  },
  {
    name: "act",
    description: "Submit a poker action when it's your turn.",
    inputSchema: {
      type: "object", additionalProperties: false,
      properties: {
        action: { type: "string", enum: ["fold", "check", "call", "raise", "all_in"] },
        amount: { type: "number", minimum: 0 },
      },
      required: ["action"],
    },
  },
  {
    name: "say",
    description: "Post a short message visible to viewers in the action log sidebar.",
    inputSchema: {
      type: "object", additionalProperties: false,
      properties: { text: { type: "string", minLength: 1, maxLength: 200 } },
      required: ["text"],
    },
  },
] as const

export const sitDownInput = z.object({ name: z.string().min(1).max(80) })
export const actInput = z.object({
  action: z.enum(["fold", "check", "call", "raise", "all_in"]),
  amount: z.number().int().min(0).optional(),
})
export const sayInput = z.object({ text: z.string().min(1).max(200) })
