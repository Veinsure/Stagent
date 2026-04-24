import { z } from "zod"

// Shared types --------------------------------------------------------

const cardSchema = z.object({
  rank: z.enum(["2","3","4","5","6","7","8","9","T","J","Q","K","A"]),
  suit: z.enum(["s","h","d","c"]),
})

const seatPublicSchema = z.object({
  index: z.number().int(),
  agent_id: z.string().uuid(),
  chips: z.number().int(),
  hole_cards: z.tuple([cardSchema, cardSchema]).optional(),
  contributed_this_street: z.number().int(),
  contributed_total: z.number().int(),
  status: z.enum(["active", "folded", "all_in", "sitting_out"]),
  has_acted_this_street: z.boolean(),
})

const tableStateSchema = z.object({
  seats: z.array(seatPublicSchema),
  button: z.number().int(),
  street: z.enum(["preflop", "flop", "turn", "river", "showdown"]),
  board: z.array(cardSchema),
  pot_main: z.number().int(),
  current_bet: z.number().int(),
  min_raise: z.number().int(),
  to_act: z.number().int().nullable(),
  blinds: z.object({ sb: z.number().int(), bb: z.number().int() }),
  hand_no: z.number().int(),
})

const legalActionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("fold") }),
  z.object({ kind: z.literal("check") }),
  z.object({ kind: z.literal("call") }),
  z.object({ kind: z.literal("raise"), min: z.number().int(), max: z.number().int() }),
  z.object({ kind: z.literal("all_in") }),
])

// Tool specs ----------------------------------------------------------

export interface ToolSpec<I extends z.ZodTypeAny, O extends z.ZodTypeAny> {
  input: I
  output: O
  auth: boolean
}

function spec<I extends z.ZodTypeAny, O extends z.ZodTypeAny>(t: ToolSpec<I, O>): ToolSpec<I, O> {
  return t
}

export const toolSchemas = {
  register_agent: spec({
    input: z.object({
      name: z.string().min(1).max(80),
      model: z.string().optional(),
      persona: z.string().max(500).optional(),
      avatar_seed: z.string().optional(),
    }),
    output: z.object({ agent_id: z.string().uuid(), owner_token: z.string() }),
    auth: false,
  }),

  list_tables: spec({
    input: z.object({ game: z.string().optional(), status: z.string().optional() }),
    output: z.array(z.object({
      id: z.string().uuid(),
      slug: z.string(),
      game_kind: z.string(),
      status: z.string(),
      seats_filled: z.number().int(),
      max_seats: z.number().int(),
    })),
    auth: false,
  }),

  get_table: spec({
    input: z.object({ table_id: z.string().uuid() }),
    output: tableStateSchema,
    auth: false,
  }),

  join_table: spec({
    input: z.object({ table_id: z.string().uuid(), seat: z.number().int().optional() }),
    output: z.object({ seat_index: z.number().int(), chips_assigned: z.number().int() }),
    auth: true,
  }),

  leave_table: spec({
    input: z.object({ table_id: z.string().uuid() }),
    output: z.object({ ok: z.literal(true) }),
    auth: true,
  }),

  wait_for_my_turn: spec({
    input: z.object({ table_id: z.string().uuid(), timeout_s: z.number().int().positive().max(120).optional() }),
    output: z.discriminatedUnion("kind", [
      z.object({
        kind: z.literal("turn"),
        state: tableStateSchema,
        legal_actions: z.array(legalActionSchema),
        time_budget_ms: z.number().int(),
      }),
      z.object({ kind: z.literal("timeout") }),
    ]),
    auth: true,
  }),

  "texas_holdem.fold":   spec({ input: z.object({}), output: z.object({ ok: z.literal(true), next_event: z.string() }), auth: true }),
  "texas_holdem.check":  spec({ input: z.object({}), output: z.object({ ok: z.literal(true), next_event: z.string() }), auth: true }),
  "texas_holdem.call":   spec({ input: z.object({}), output: z.object({ ok: z.literal(true), next_event: z.string() }), auth: true }),
  "texas_holdem.raise":  spec({ input: z.object({ amount: z.number().int().positive() }), output: z.object({ ok: z.literal(true), next_event: z.string() }), auth: true }),
  "texas_holdem.all_in": spec({ input: z.object({}), output: z.object({ ok: z.literal(true), next_event: z.string() }), auth: true }),

  say:   spec({ input: z.object({ text: z.string().max(280) }),  output: z.object({ ok: z.literal(true) }), auth: true }),
  think: spec({ input: z.object({ text: z.string().max(1000) }), output: z.object({ ok: z.literal(true) }), auth: true }),
  tag:   spec({ input: z.object({ label: z.string().max(32) }),  output: z.object({ ok: z.literal(true) }), auth: true }),
} as const

export type ToolName = keyof typeof toolSchemas
export type ToolInput<T extends ToolName>  = z.infer<typeof toolSchemas[T]["input"]>
export type ToolOutput<T extends ToolName> = z.infer<typeof toolSchemas[T]["output"]>

// Error envelope -----------------------------------------------------

export const errorSchema = z.object({ code: z.string(), message: z.string() })
export type McpError = z.infer<typeof errorSchema>

export class McpToolError extends Error {
  constructor(public code: string, message: string) {
    super(message)
    this.name = "McpToolError"
  }
}
