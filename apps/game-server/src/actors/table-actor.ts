import { Actor } from "@stagent/actor-core"
import { TexasHoldemModule, type TexasHoldemState, type TexasHoldemAction } from "@stagent/texas-holdem"
import type { AgentId } from "@stagent/shared"
import type { Db } from "../db/client.js"
import { tableSeats, hands, actions } from "@stagent/db-schema"
import { eq, and } from "drizzle-orm"
import { McpToolError } from "@stagent/mcp-tools"

export interface TableMeta {
  id: string
  slug: string
  blinds: { sb: number; bb: number }
  max_seats: number
}

export type TableCmd =
  | { kind: "join"; agent_id: AgentId; seat?: number }
  | { kind: "leave"; agent_id: AgentId }
  | { kind: "apply_action"; agent_id: AgentId; action: TexasHoldemAction }
  | { kind: "wait_for_turn"; agent_id: AgentId; deadline_ms: number }
  | { kind: "disconnect"; agent_id: AgentId }
  | { kind: "reconnect"; agent_id: AgentId }
  | { kind: "snapshot_viewer" }
  | { kind: "snapshot_agent"; agent_id: AgentId }
  | { kind: "turn_timeout_fired"; seat_idx: number }

type TableResult = unknown

export class TableActor extends Actor<TableCmd, TableResult> {
  state: TexasHoldemState | null = null      // null while waiting for first 2 seats
  private currentHandId: string | null = null
  private handNo = 0
  private waiters: Map<AgentId, (r: unknown) => void> = new Map()

  constructor(public readonly meta: TableMeta, private db: Db) {
    super()
  }

  async handle(cmd: TableCmd): Promise<TableResult> {
    switch (cmd.kind) {
      case "join":              return await this.onJoin(cmd.agent_id, cmd.seat)
      case "leave":              return await this.onLeave(cmd.agent_id)
      case "snapshot_viewer":    return this.state ? TexasHoldemModule.redactForViewer(this.state) : null
      case "snapshot_agent":     return this.state ? TexasHoldemModule.redactForAgent(this.state, cmd.agent_id) : null
      default: throw new McpToolError("unknown_cmd", `not yet implemented: ${cmd.kind}`)
    }
  }

  private async onJoin(agent_id: AgentId, seat?: number): Promise<{ seat_index: number; chips_assigned: number }> {
    const existing = await this.db.select().from(tableSeats).where(eq(tableSeats.table_id, this.meta.id))
    const taken = new Set(existing.map((s) => s.seat_index))
    if (existing.find((s) => s.agent_id === agent_id)) {
      throw new McpToolError("already_seated_here", "already at this table")
    }
    let idx = seat ?? -1
    if (idx >= 0) {
      if (taken.has(idx)) throw new McpToolError("seat_taken", `seat ${idx} occupied`)
    } else {
      for (let i = 0; i < this.meta.max_seats; i++) {
        if (!taken.has(i)) { idx = i; break }
      }
      if (idx < 0) throw new McpToolError("table_full", "no free seats")
    }
    const chips = 1000                              // W2: fixed starting stack
    await this.db.insert(tableSeats).values({
      table_id: this.meta.id,
      seat_index: idx,
      agent_id,
      chips,
    })
    // Rebuild state from seats if we now have >= 2
    await this.maybeStartHand()
    return { seat_index: idx, chips_assigned: chips }
  }

  private async onLeave(agent_id: AgentId): Promise<{ ok: true }> {
    await this.db.delete(tableSeats).where(and(eq(tableSeats.table_id, this.meta.id), eq(tableSeats.agent_id, agent_id)))
    // Do not rebuild state mid-hand; seat marked folded in-memory on action path (Task 18)
    return { ok: true }
  }

  /** Start a new hand if we have >= 2 seated and no open hand. */
  private async maybeStartHand(): Promise<void> {
    if (this.state) return                              // already running
    const seats = await this.db.select().from(tableSeats).where(eq(tableSeats.table_id, this.meta.id))
    if (seats.length < 2) return
    this.handNo++
    const rng_seed = `${this.meta.id}-${this.handNo}-${Date.now()}`
    const state = TexasHoldemModule.createTable({
      seats: seats.sort((a, b) => a.seat_index - b.seat_index).map((s) => ({ agent_id: s.agent_id, chips: s.chips })),
      rng_seed,
      blinds: this.meta.blinds,
    })
    this.state = state
    // Insert hands row
    const [row] = await this.db.insert(hands).values({
      table_id: this.meta.id,
      hand_no: this.handNo,
      rng_seed,
      pot_total: state.pot_main,
    }).returning({ id: hands.id })
    this.currentHandId = row!.id
  }

  // Exposed for Task 13 (waiter map)
  resolveWaiter(agent_id: AgentId, payload: unknown): void {
    const w = this.waiters.get(agent_id)
    if (w) { this.waiters.delete(agent_id); w(payload) }
  }

  addWaiter(agent_id: AgentId, resolve: (r: unknown) => void): void {
    this.waiters.set(agent_id, resolve)
  }

  removeWaiter(agent_id: AgentId): void {
    this.waiters.delete(agent_id)
  }

  get handId(): string | null { return this.currentHandId }
  seatIdx(agent_id: AgentId): number {
    if (!this.state) return -1
    return this.state.seats.find((s) => s.agent_id === agent_id)?.index ?? -1
  }
}
