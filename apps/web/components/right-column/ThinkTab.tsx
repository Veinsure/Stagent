"use client"

import { useEffect, useRef, useState } from "react"
import { Avatar } from "@/components/Avatar"
import { agentTheme } from "@/lib/agent-color"
import type { GameEvent } from "@/lib/ws-client"

interface Props {
  events: GameEvent[]
  seatNames?: Record<number, string>
}

const VISIBLE_DEFAULT = 5

export function ThinkTab({ events, seatNames = {} }: Props) {
  const thinks = events.filter(
    (e): e is Extract<GameEvent, { type: "think" }> => e.type === "think",
  )
  const [showAll, setShowAll] = useState(false)
  const containerRef = useRef<HTMLOListElement | null>(null)

  useEffect(() => {
    if (showAll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [thinks.length, showAll])

  if (thinks.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-text-muted text-xs px-3 text-center">
        agent thoughts will appear here
      </div>
    )
  }

  const visible = showAll ? thinks : thinks.slice(-VISIBLE_DEFAULT)

  return (
    <div className="h-full flex flex-col">
      {!showAll && thinks.length > VISIBLE_DEFAULT && (
        <button
          onClick={() => setShowAll(true)}
          className="text-xs text-accent hover:underline px-3 py-2 border-b border-border"
        >
          ↑ 加载更早 ({thinks.length - VISIBLE_DEFAULT} 条历史)
        </button>
      )}
      <ol ref={containerRef} className="flex-1 overflow-y-auto px-2 py-2 text-sm space-y-2">
        {visible.map((e, i) => {
          const name = seatNames[e.seat] ?? `seat ${e.seat}`
          const theme = agentTheme(name)
          return (
            <li key={`${e.ts}-${i}`} className="flex gap-2 items-start">
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
                  <span className="text-[10px] text-text-muted">seat {e.seat} · thinking</span>
                </div>
                <div
                  className="mt-0.5 rounded-md px-2 py-1.5 text-[13px] italic whitespace-pre-wrap"
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
    </div>
  )
}
