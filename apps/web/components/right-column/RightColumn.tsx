"use client"

import { Tabs } from "@/components/Tabs"
import type { GameEvent } from "@/lib/ws-client"
import { ThinkTab } from "./ThinkTab"
import { SayTab } from "./SayTab"
import { LogTab } from "./LogTab"

interface Props {
  events: GameEvent[]
  seatNames?: Record<number, string>
}

export function RightColumn({ events, seatNames = {} }: Props) {
  return (
    <Tabs
      tabs={[
        { id: "think", label: "Think" },
        { id: "say", label: "Say" },
        { id: "log", label: "Log" },
      ]}
      initialId="think"
      render={(id) => {
        if (id === "think") return <ThinkTab events={events} seatNames={seatNames} />
        if (id === "say") return <SayTab events={events} seatNames={seatNames} />
        return <LogTab events={events} />
      }}
    />
  )
}
