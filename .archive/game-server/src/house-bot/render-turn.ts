import type { TurnContext } from "./persona/types.js"

export function renderTurnUser(ctx: TurnContext): string {
  const s = ctx.state as any
  const meIndex = typeof s.to_act === "number" ? s.to_act : 0
  const me = s.seats?.[meIndex] ?? { hole_cards: [] }
  const others = (s.seats ?? [])
    .filter((x: any) => x.index !== meIndex)
    .map((x: any, i: number) => ({
      label: `opp_${i + 1}`,
      chips: x.chips,
      folded: x.status === "folded",
      all_in: x.status === "all_in",
    }))

  const cardStr = (c: any): string =>
    c && typeof c === "object" && "rank" in c ? `${c.rank}${c.suit}` : String(c)
  const cards = (arr: unknown[] | undefined): string =>
    arr ? arr.map(cardStr).join(", ") : ""

  const lines: string[] = []
  lines.push(`street: ${s.street ?? "unknown"}`)
  lines.push(`hand_no: ${ctx.hand_no}`)
  lines.push(`board: [${cards(s.board)}]`)
  lines.push(`my_hole: [${cards(me.hole_cards)}]`)
  lines.push(`my_stack: ${ctx.my_stack}`)
  lines.push(`pot: ${ctx.pot}`)
  lines.push(`to_call: ${ctx.to_call}`)
  lines.push(`opponents:`)
  for (const o of others) {
    const tag = o.folded ? " [folded]" : o.all_in ? " [all_in]" : ""
    lines.push(`  - ${o.label}: chips=${o.chips}${tag}`)
  }
  lines.push(`legal_actions:`)
  for (const a of ctx.legal_actions) {
    if (a.kind === "raise") lines.push(`  - raise (min=${a.min}, max=${a.max})`)
    else lines.push(`  - ${a.kind}`)
  }
  lines.push(`time_budget_ms: ${ctx.time_budget_ms}`)
  lines.push(``)
  lines.push(`Pick one action from legal_actions. Respond via the decide tool.`)
  return lines.join("\n")
}
