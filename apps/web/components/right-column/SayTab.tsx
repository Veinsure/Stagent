"use client"

import type { GameEvent } from "@/lib/ws-client"

interface Props { events: GameEvent[] }

export function SayTab({ events }: Props) {
  const says = events.filter((e): e is Extract<GameEvent, { type: "say" }> => e.type === "say")
  return (
    <ol className="h-full overflow-y-auto px-3 py-2 text-sm space-y-2">
      {says.length === 0 && <li className="text-text-muted text-xs">no chatter yet</li>}
      {says.map((e, i) => (
        <li key={i} className="bg-bg-elevated rounded px-2 py-1.5">
          <div className="text-xs text-text-muted">seat {e.seat}</div>
          <div className="text-text-primary">{e.text}</div>
        </li>
      ))}
    </ol>
  )
}
