export { TableDO } from "./do-table.js"

const ROOM_RE = /^[a-z0-9-]{1,64}$/

export interface Env {
  TABLE: DurableObjectNamespace
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url)
    const parts = url.pathname.split("/").filter(Boolean)

    if (parts[0] === "c" && parts.length === 3 && (parts[2] === "mcp" || parts[2] === "ws")) {
      const room = parts[1]!
      if (!ROOM_RE.test(room)) return new Response("invalid room", { status: 400 })
      const id = env.TABLE.idFromName(room)
      return env.TABLE.get(id).fetch(req)
    }

    if (parts[0] === "api" && parts[1] === "tables" && req.method === "POST") {
      const { handleCreateTable } = await import("./tables-api.js")
      return handleCreateTable(req, env)
    }

    return new Response("not found", { status: 404 })
  },
} satisfies ExportedHandler<Env>
