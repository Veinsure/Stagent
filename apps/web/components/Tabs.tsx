"use client"

import { useState, type ReactNode } from "react"
import clsx from "clsx"

export interface TabDef {
  id: string
  label: string
}

interface Props {
  tabs: TabDef[]
  initialId?: string
  render: (activeId: string) => ReactNode
  className?: string
}

export function Tabs({ tabs, initialId, render, className }: Props) {
  const [active, setActive] = useState(initialId ?? tabs[0]!.id)
  return (
    <div className={clsx("flex flex-col h-full", className)}>
      <div className="flex border-b border-border bg-bg-surface">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={clsx(
              "px-4 py-2 text-sm font-medium transition border-b-2",
              active === t.id
                ? "text-text-primary border-accent"
                : "text-text-muted border-transparent hover:text-text-primary",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">{render(active)}</div>
    </div>
  )
}
