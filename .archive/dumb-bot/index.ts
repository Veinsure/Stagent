import { createMcpClientWs } from "@stagent/mcp-tools"

const url = process.env.STAGENT_WS_URL ?? "ws://localhost:8080/mcp"
const name = process.env.BOT_NAME ?? `dumb-bot-${Math.floor(Math.random() * 1000)}`

const c = await createMcpClientWs(url)
const { agent_id, owner_token } = await c.call("register_agent", { name })
c.setOwnerToken(owner_token)
console.log(`registered ${name} as ${agent_id}`)

const tables = await c.call("list_tables", { game: "texas_holdem", status: "live" })
if (tables.length === 0) { console.error("no live tables"); process.exit(1) }

let joinedTable: string | null = null
for (const t of tables) {
  try {
    await c.call("join_table", { table_id: t.id })
    joinedTable = t.id
    console.log(`joined ${t.slug}`)
    break
  } catch (e) {
    if ((e as Error).message.match(/table_full|already_seated_here/)) continue
    throw e
  }
}
if (!joinedTable) { console.error("all tables full"); process.exit(1) }

while (true) {
  const turn = await c.call("wait_for_my_turn", { table_id: joinedTable, timeout_s: 60 })
  if (turn.kind === "timeout") continue
  const pick = turn.legal_actions.find((a) => a.kind === "check")
           ?? turn.legal_actions.find((a) => a.kind === "call")
           ?? { kind: "fold" as const }
  await c.call(`texas_holdem.${pick.kind}`, {} as any)
  console.log(`played ${pick.kind}`)
}
