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
  | { kind: "say"; agent_id: AgentId; text: string }
  | { kind: "think"; agent_id: AgentId; text: string }
  | { kind: "tag"; agent_id: AgentId; label: string }

type TableResult = unknown

const TURN_BUDGET_MS = Number(process.env.TURN_BUDGET_MS ?? 30000)

export class TableActor extends Actor<TableCmd, TableResult> {
  state: TexasHoldemState | null = null      // null while waiting for first 2 seats
  private currentHandId: string | null = null
  private handNo = 0
  private waiters: Map<AgentId, (r: unknown) => void> = new Map()
  private turnTimer: NodeJS.Timeout | null = null
  private droppedSince: Map<AgentId, number> = new Map()
  private dropTimers: Map<AgentId, NodeJS.Timeout> = new Map()
  private readonly reconnectGraceMs = Number(process.env.RECONNECT_GRACE_MS ?? 60000)

  constructor(public readonly meta: TableMeta, private db: Db) {
    super()
  }

  async handle(cmd: TableCmd): Promise<TableResult> {
    switch (cmd.kind) {
      case "join":              return await this.onJoin(cmd.agent_id, cmd.seat)
      case "leave":              return await this.onLeave(cmd.agent_id)
      case "apply_action":       return await this.onApplyAction(cmd.agent_id, cmd.action)
      case "snapshot_viewer":    return this.state ? TexasHoldemModule.redactForViewer(this.state) : null
      case "snapshot_agent":     return this.state ? TexasHoldemModule.redactForAgent(this.state, cmd.agent_id) : null
      case "turn_timeout_fired": return await this.onTurnTimeout(cmd.seat_idx)
      case "disconnect":         return this.onDisconnect(cmd.agent_id)
      case "reconnect":          return this.onReconnect(cmd.agent_id)
      case "say":                return await this.onExpression(cmd.agent_id, "say", cmd.text, false)
      case "think":              return await this.onExpression(cmd.agent_id, "think", cmd.text, true)
      case "tag":                return await this.onExpression(cmd.agent_id, "tag", cmd.label, false)
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
    this.scheduleTurnTimeout()
  }

  private async onApplyAction(agent_id: AgentId, action: TexasHoldemAction): Promise<{ ok: true; next_event: string }> {
    if (!this.state) throw new McpToolError("not_seated", "no hand in progress")
    let result
    try {
      result = TexasHoldemModule.applyAction(this.state, action, agent_id)
    } catch (e) {
      // Persist illegal action for audit
      if (this.currentHandId) {
        await this.db.insert(actions).values({
          hand_id: this.currentHandId,
          agent_id,
          street: this.state.street,
          kind: "illegal",
          text: e instanceof Error ? e.message : String(e),
        })
      }
      if (e instanceof Error && /not_your_turn/i.test(e.message)) throw new McpToolError("not_your_turn", e.message)
      if (e instanceof Error && /invalid_amount/i.test(e.message)) throw new McpToolError("invalid_amount", e.message)
      throw new McpToolError("illegal_action", e instanceof Error ? e.message : String(e))
    }
    this.state = result.state
    this.clearTurnTimer()
    // Write an actions row for the concrete event
    if (this.currentHandId) {
      const street = result.state.street
      const amount = "amount" in action ? action.amount : this.inferAmountForLog(agent_id, action.kind)
      await this.db.insert(actions).values({
        hand_id: this.currentHandId,
        agent_id,
        street,
        kind: action.kind,
        amount: amount ?? null,
      })
    }
    // Hand ends only when the engine emits a hand_ended event (carries winners + pot)
    const handEnded = result.events.find((e: any) => e.kind === "hand_ended")
    if (handEnded) {
      const winners = (handEnded as any).payload?.winners ?? []
      await this.finalizeHand(winners)
    } else {
      this.scheduleTurnTimeout()
    }
    // Resolve waiter for new to_act
    if (this.state && this.state.to_act !== null) {
      const nextAgent = this.state.seats[this.state.to_act]!.agent_id
      this.resolveWaiter(nextAgent, this.buildTurnPayload(nextAgent))
    }
    return { ok: true, next_event: this.detectNextEvent(result.events) }
  }

  private inferAmountForLog(agent_id: AgentId, kind: string): number | undefined {
    if (!this.state) return undefined
    const seat = this.state.seats.find((s) => s.agent_id === agent_id)
    if (!seat) return undefined
    if (kind === "call") return seat.contributed_this_street
    if (kind === "all_in") return seat.contributed_this_street
    return undefined
  }

  private detectNextEvent(events: any[]): string {
    const last = events[events.length - 1]
    if (last?.kind === "hand_ended") return "hand_ended"
    if (!this.state) return "noop"
    if (this.state.street === "showdown") return "hand_ended"
    if (this.state.to_act === null) return "hand_ended"
    return "turn_ended"
  }

  private async finalizeHand(winners: { agent_id: string; won: number }[]): Promise<void> {
    if (!this.state || !this.currentHandId) return
    this.clearTurnTimer()
    const pot_total = winners.reduce((sum, w) => sum + w.won, 0)
    // Close current hand row
    await this.db
      .update(hands)
      .set({
        ended_at: new Date(),
        winners,
        pot_total,
        board: this.state.board,
      })
      .where(eq(hands.id, this.currentHandId))
    // hand_ended action log for each winner
    for (const w of winners) {
      await this.db.insert(actions).values({
        hand_id: this.currentHandId,
        agent_id: w.agent_id,
        street: "showdown",
        kind: "hand_ended",
        amount: w.won,
      })
    }
    this.currentHandId = null
    this.state = null
    // Auto-start next hand if >= 2 seated
    await this.maybeStartHand()
    // Wake up new to_act
    const stateAfterMaybeStart = this.state as TexasHoldemState | null
    if (stateAfterMaybeStart && stateAfterMaybeStart.to_act !== null) {
      const next = stateAfterMaybeStart.seats[stateAfterMaybeStart.to_act]!.agent_id
      this.resolveWaiter(next, this.buildTurnPayload(next))
    }
  }

  private scheduleTurnTimeout(): void {
    this.clearTurnTimer()
    if (!this.state || this.state.to_act === null) return
    const seat = this.state.seats[this.state.to_act]
    if (!seat) return
    this.turnTimer = setTimeout(() => {
      this.enqueue({ kind: "turn_timeout_fired", seat_idx: seat.index }).catch(() => {})
    }, TURN_BUDGET_MS)
  }

  private clearTurnTimer(): void {
    if (this.turnTimer) { clearTimeout(this.turnTimer); this.turnTimer = null }
  }

  private async onTurnTimeout(seat_idx: number): Promise<void> {
    if (!this.state || this.state.to_act !== seat_idx) return      // stale timer, ignore
    const seat = this.state.seats[seat_idx]
    if (!seat) return
    const legal = TexasHoldemModule.legalActions(this.state, seat.agent_id)
    const pick = legal.find((a) => a.kind === "check") ?? ({ kind: "fold" } as const)
    // Log auto_timeout
    if (this.currentHandId) {
      await this.db.insert(actions).values({
        hand_id: this.currentHandId,
        agent_id: seat.agent_id,
        street: this.state.street,
        kind: "auto_timeout",
        text: `auto-${pick.kind}`,
      })
    }
    // Apply the chosen action
    await this.onApplyAction(seat.agent_id, pick as TexasHoldemAction)
  }

  private onDisconnect(agent_id: AgentId): void {
    this.droppedSince.set(agent_id, Date.now())
    // After grace: auto-fold (if to_act) and remove from table
    const timer = setTimeout(() => {
      this.enqueue({ kind: "leave", agent_id }).catch(() => {})
      this.droppedSince.delete(agent_id)
      this.dropTimers.delete(agent_id)
    }, this.reconnectGraceMs)
    this.dropTimers.set(agent_id, timer)
  }

  private onReconnect(agent_id: AgentId): void {
    const timer = this.dropTimers.get(agent_id)
    if (timer) clearTimeout(timer)
    this.dropTimers.delete(agent_id)
    this.droppedSince.delete(agent_id)
  }

  private async onExpression(agent_id: AgentId, kind: "say" | "think" | "tag", text: string, thought_private: boolean): Promise<{ ok: true }> {
    if (!this.currentHandId) throw new McpToolError("not_seated", "no hand in progress")
    await this.db.insert(actions).values({
      hand_id: this.currentHandId,
      agent_id,
      street: this.state?.street ?? "preflop",
      kind,
      text,
      thought_private,
    })
    return { ok: true }
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

  /**
   * Public non-actor method. Safe because:
   * - it only reads this.state snapshot (state changes atomically in handle)
   * - it only writes to waiter map; handle calls resolveWaiter which also only touches waiter map
   * - no intermediate await between the to_act check and the resolve registration
   */
  async awaitTurn(agent_id: AgentId, deadline_ms: number): Promise<unknown> {
    if (!this.state) return { kind: "timeout" }
    const seat = this.state.seats.find((s) => s.agent_id === agent_id)
    if (!seat) throw new McpToolError("not_seated", "")
    if (this.state.to_act === seat.index) return this.buildTurnPayload(agent_id)
    const timeLeft = deadline_ms - Date.now()
    if (timeLeft <= 0) return { kind: "timeout" }
    return await new Promise<unknown>((resolve) => {
      const timer = setTimeout(() => {
        this.removeWaiter(agent_id)
        resolve({ kind: "timeout" })
      }, timeLeft)
      this.addWaiter(agent_id, (payload) => { clearTimeout(timer); resolve(payload) })
    })
  }

  private buildTurnPayload(agent_id: AgentId) {
    const redacted = TexasHoldemModule.redactForAgent(this.state!, agent_id)
    return {
      kind: "turn" as const,
      state: redacted,
      legal_actions: TexasHoldemModule.legalActions(this.state!, agent_id),
      time_budget_ms: 30000,
    }
  }
}
