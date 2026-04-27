"use client"

import type { GameEvent } from "@/lib/ws-client"

interface Props { events: GameEvent[] }

function describe(e: GameEvent): { tag: string; body: string } {
  switch (e.type) {
    case "snapshot":    return { tag: "snap",  body: "table snapshot" }
    case "hand_start":  return { tag: "hand",  body: `start #${e.handId} · dealer ${e.dealer}` }
    case "action":      return { tag: "act",   body: `seat ${e.seat} · ${e.action}${e.amount !== undefined ? ` ${e.amount}` : ""}` }
    case "board":       return { tag: "board", body: `${e.cards.length} card(s)` }
    case "showdown":    return { tag: "show",  body: "showdown" }
    case "seat_update": return { tag: "seat",  body: `seat ${e.seat} → ${e.kind}${e.name ? ` (${e.name})` : ""}` }
    case "say":         return { tag: "say",   body: `seat ${e.seat}: ${e.text}` }
    case "think":       return { tag: "think", body: `seat ${e.seat}: ${e.text}` }
  }
}

const TAG_COLOR: Record<string, string> = {
  snap:  "text-text-muted",
  hand:  "text-warn",
  act:   "text-text-primary",
  board: "text-blue-400",
  show:  "text-orange-400",
  seat:  "text-online",
  say:   "text-accent",
  think: "text-text-muted italic",
}

export function LogTab({ events }: Props) {
  return (
    <ol className="h-full overflow-y-auto px-2 py-1 text-xs space-y-0.5 font-mono">
      {events.length === 0 && (
        <li className="text-text-muted px-1 py-1">waiting for events…</li>
      )}
      {events.map((e, i) => {
        const d = describe(e)
        return (
          <li key={i} className="flex gap-2 px-1 py-0.5">
            <span className={`shrink-0 w-12 ${TAG_COLOR[d.tag] ?? ""}`}>{d.tag}</span>
            <span className="text-text-primary">{d.body}</span>
          </li>
        )
      })}
    </ol>
  )
}
