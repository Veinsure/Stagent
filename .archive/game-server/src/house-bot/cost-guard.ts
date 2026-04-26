export interface Usage {
  input_tokens: number
  output_tokens: number
}

export interface PersonaRate {
  in: number
  out: number
}

// NOTE: token prices below are placeholders. Verify against current Anthropic / OpenAI
// pricing pages before any paid smoke run. Values are USD per 1K tokens.
export const RATES: Record<string, PersonaRate> = {
  "claude-tight": { in: 15 / 1000, out: 75 / 1000 },
  "gpt-aggro": { in: 5 / 1000, out: 20 / 1000 },
}

export interface CostGuardOpts {
  budgetUsd: number
  rates: Record<string, PersonaRate>
}

export interface ChargeResult {
  allow: boolean
  spent_usd: number
  delta_usd: number
}

export class CostGuard {
  private spent = new Map<string, number>()

  constructor(private opts: CostGuardOpts) {}

  charge(persona: string, usage: Usage): ChargeResult {
    const rate = this.opts.rates[persona]
    const delta = rate
      ? (usage.input_tokens / 1000) * rate.in + (usage.output_tokens / 1000) * rate.out
      : 0
    const cur = (this.spent.get(persona) ?? 0) + delta
    this.spent.set(persona, cur)
    return { allow: cur < this.opts.budgetUsd, spent_usd: cur, delta_usd: delta }
  }

  isOverBudget(persona: string): boolean {
    return (this.spent.get(persona) ?? 0) >= this.opts.budgetUsd
  }

  snapshot(): Record<string, number> {
    return Object.fromEntries(this.spent)
  }
}
