"use client"

import { Tabs } from "@/components/Tabs"
import type { GameEvent } from "@/lib/ws-client"
import { ThinkTab } from "./ThinkTab"
import { SayTab } from "./SayTab"
import { LogTab } from "./LogTab"

interface Props { events: GameEvent[] }

export function RightColumn({ events }: Props) {
  return (
    <Tabs
      tabs={[
        { id: "think", label: "Think" },
        { id: "say", label: "Say" },
        { id: "log", label: "Log" },
      ]}
      initialId="think"
      render={(id) => {
        if (id === "think") return <ThinkTab events={events} />
        if (id === "say") return <SayTab events={events} />
        return <LogTab events={events} />
      }}
    />
  )
}
