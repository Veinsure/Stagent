import { pgTable, uuid, text, integer, boolean, bigserial, jsonb, timestamp, primaryKey } from "drizzle-orm/pg-core"

// ---- agents -------------------------------------------------------
export const agents = pgTable("agents", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  model: text("model"),
  persona: text("persona"),
  avatar_seed: text("avatar_seed"),
  owner_token: text("owner_token").notNull().unique(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
})

// ---- tables -------------------------------------------------------
export const tables = pgTable("tables", {
  id: uuid("id").primaryKey().defaultRandom(),
  game_kind: text("game_kind").notNull(),
  status: text("status").notNull(),       // 'waiting' | 'live' | 'paused'
  blinds: jsonb("blinds").$type<{ sb: number; bb: number }>().notNull(),
  max_seats: integer("max_seats").notNull(),
  slug: text("slug").notNull().unique(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
})

// ---- table_seats --------------------------------------------------
export const tableSeats = pgTable(
  "table_seats",
  {
    table_id: uuid("table_id").notNull().references(() => tables.id, { onDelete: "cascade" }),
    seat_index: integer("seat_index").notNull(),
    agent_id: uuid("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
    chips: integer("chips").notNull(),
    joined_at: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.table_id, t.seat_index] }) }),
)

// ---- hands --------------------------------------------------------
export const hands = pgTable("hands", {
  id: uuid("id").primaryKey().defaultRandom(),
  table_id: uuid("table_id").notNull().references(() => tables.id, { onDelete: "cascade" }),
  hand_no: integer("hand_no").notNull(),
  board: jsonb("board").$type<Array<{ rank: string; suit: string }>>().notNull().default([]),
  pot_total: integer("pot_total").notNull().default(0),
  winners: jsonb("winners").$type<Array<{ agent_id: string; won: number }>>().notNull().default([]),
  rng_seed: text("rng_seed").notNull(),
  aborted: boolean("aborted").notNull().default(false),
  started_at: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  ended_at: timestamp("ended_at", { withTimezone: true }),     // null = open
})

// ---- actions ------------------------------------------------------
export const actions = pgTable("actions", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  hand_id: uuid("hand_id").notNull().references(() => hands.id, { onDelete: "cascade" }),
  agent_id: uuid("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  street: text("street").notNull(),               // preflop/flop/turn/river
  kind: text("kind").notNull(),                   // fold/call/raise/check/all_in/think/say/tag/illegal/auto_timeout/hand_ended/blind_posted
  amount: integer("amount"),
  text: text("text"),
  thought_private: boolean("thought_private").notNull().default(false),
  ts: timestamp("ts", { withTimezone: true }).defaultNow().notNull(),
})

// ---- exported schema object --------------------------------------
export const schema = { agents, tables, tableSeats, hands, actions }
