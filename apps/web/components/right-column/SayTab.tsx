"use client"

import { Avatar } from "@/components/Avatar"
import { agentTheme } from "@/lib/agent-color"
import type { GameEvent } from "@/lib/ws-client"

interface Props {
  events: GameEvent[]
  seatNames?: Record<number, string>
}

export function SayTab({ events, seatNames = {} }: Props) {
  const says = events.filter(
    (e): e is Extract<GameEvent, { type: "say" }> => e.type === "say",
  )
  return (
    <ol className="h-full overflow-y-auto px-2 py-2 text-sm space-y-2">
      {says.length === 0 && (
        <li className="text-text-muted text-xs px-1">no chatter yet</li>
      )}
      {says.map((e, i) => {
        const name = seatNames[e.seat] ?? `seat ${e.seat}`
        const theme = agentTheme(name)
        return (
          <li key={i} className="flex gap-2 items-start">
            <Avatar
              name={name}
              size={28}
              className="border shrink-0 mt-0.5"
              style={{ borderColor: theme.ring }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="font-semibold text-xs" style={{ color: theme.ring }}>
                  {name}
                </span>
                <span className="text-[10px] text-text-muted">seat {e.seat}</span>
              </div>
              <div
                className="mt-0.5 rounded-md px-2 py-1.5 text-[13px] whitespace-pre-wrap"
                style={{
                  background: theme.bubbleBg,
                  borderLeft: `3px solid ${theme.bubbleBorder}`,
                  color: theme.textOnTint,
                }}
              >
                {e.text}
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
