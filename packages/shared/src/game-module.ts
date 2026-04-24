export type AgentId = string

export interface BroadcastEvent {
  kind: string
  payload: Record<string, unknown>
  ts: number
}

export interface TableOpts {
  seats: Array<{ agent_id: AgentId; chips: number }>
  rng_seed: string
  blinds?: { sb: number; bb: number }
  [key: string]: unknown
}

export interface GameModule<S, A, L = A> {
  /** Stable name, e.g. 'texas_holdem'. */
  readonly name: string

  /** Build a fresh table state from setup options. */
  createTable(opts: TableOpts): S

  /**
   * Apply an action by `by`. Pure function. Returns the next state and any
   * broadcast events for observers. Throws if the action is illegal.
   */
  applyAction(state: S, action: A, by: AgentId): { state: S; events: BroadcastEvent[] }

  /**
   * Describe currently-legal actions for `by`. The descriptor type `L` may be
   * richer than `A` (e.g., a `raise` descriptor exposes min/max range, while
   * the `raise` action carries a single concrete amount). Empty array if not
   * their turn. Defaults `L = A` for games where the two coincide.
   */
  legalActions(state: S, by: AgentId): L[]

  /** Snapshot for storage. */
  serialize(state: S): unknown
  deserialize(raw: unknown): S

  /** Strip private info before sending to public viewers. */
  redactForViewer(state: S): S

  /** Strip private info except for the named agent's perspective. */
  redactForAgent(state: S, by: AgentId): S
}
