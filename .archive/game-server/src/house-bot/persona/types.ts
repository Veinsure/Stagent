import type { TexasHoldemState } from "@stagent/texas-holdem"

export type LegalAction =
  | { kind: "fold" }
  | { kind: "check" }
  | { kind: "call" }
  | { kind: "raise"; min: number; max: number }
  | { kind: "all_in" }

export type ChosenAction =
  | { kind: "fold" }
  | { kind: "check" }
  | { kind: "call" }
  | { kind: "raise"; amount: number }
  | { kind: "all_in" }

export interface TurnContext {
  state: TexasHoldemState
  legal_actions: LegalAction[]
  time_budget_ms: number
  hand_no: number
  my_stack: number
  pot: number
  to_call: number
}

export interface Decision {
  think?: string
  say?: string
  action: ChosenAction
}

export interface Persona {
  name: string
  display_name: string
  model?: string
  avatar_seed: string
  bio: string
  decide(ctx: TurnContext, signal: AbortSignal): Promise<Decision>
}
