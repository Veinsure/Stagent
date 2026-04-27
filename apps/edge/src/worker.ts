export { TableDO } from "./do-table.js"

const ROOM_RE = /^[a-z0-9-]{1,64}$/

export interface Env {
  TABLE: DurableObjectNamespace
  DB: D1Database
  PRESENCE: KVNamespace
}

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Mcp-Session-Id, X-Owner-Token, Cookie, Authorization",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Expose-Headers": "Mcp-Session-Id, Set-Cookie",
  "Access-Control-Max-Age": "86400",
}

function withCors(res: Response): Response {
  const headers = new Headers(res.headers)
  for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v)
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers })
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS })
    }

    const url = new URL(req.url)
    const parts = url.pathname.split("/").filter(Boolean)

    if (parts[0] === "c" && parts.length === 3 && (parts[2] === "mcp" || parts[2] === "ws")) {
      const room = parts[1]!
      if (!ROOM_RE.test(room)) return withCors(new Response("invalid room", { status: 400 }))
      const id = env.TABLE.idFromName(room)
      const res = await env.TABLE.get(id).fetch(req)
      // WS upgrade response (101) must not be wrapped — webSocket handle is lost.
      if (res.status === 101) return res
      return withCors(res)
    }

    if (parts[0] === "api" && parts[1] === "auth") {
      const { handleRegister, handleLogin, handleLogout, handleMe } = await import("./auth-api.js")
      if (parts[2] === "register" && req.method === "POST") return withCors(await handleRegister(req, env))
      if (parts[2] === "login"    && req.method === "POST") return withCors(await handleLogin(req, env))
      if (parts[2] === "logout"   && req.method === "POST") return withCors(await handleLogout(req, env))
      if (parts[2] === "me"       && req.method === "GET")  return withCors(await handleMe(req, env))
      return withCors(new Response("not found", { status: 404 }))
    }

    if (parts[0] === "api" && parts[1] === "me" && parts[2] === "following" && parts.length === 3 && req.method === "GET") {
      const { handleListMyFollowing } = await import("./follows-api.js")
      return withCors(await handleListMyFollowing(req, env))
    }

    if (parts[0] === "api" && parts[1] === "me" && parts[2] === "agents") {
      const mod = await import("./agents-api.js")
      if (parts.length === 3 && req.method === "GET")  return withCors(await mod.handleListAgents(req, env))
      if (parts.length === 3 && req.method === "POST") return withCors(await mod.handleCreateAgent(req, env))
      if (parts.length === 4 && req.method === "DELETE") return withCors(await mod.handleDeleteAgent(req, env, parts[3]!))
      if (parts.length === 5 && parts[4] === "rotate" && req.method === "POST") {
        return withCors(await mod.handleRotateAgent(req, env, parts[3]!))
      }
      return withCors(new Response("not found", { status: 404 }))
    }

    if (parts[0] === "api" && parts[1] === "users" && parts.length === 4 && parts[3] === "follow") {
      const { handleFollow, handleUnfollow } = await import("./follows-api.js")
      const name = decodeURIComponent(parts[2]!)
      if (req.method === "POST") return withCors(await handleFollow(req, env, name))
      if (req.method === "DELETE") return withCors(await handleUnfollow(req, env, name))
    }

    if (parts[0] === "api" && parts[1] === "users" && parts.length === 3 && req.method === "GET") {
      const { handleGetUser } = await import("./users-api.js")
      return withCors(await handleGetUser(req, env, decodeURIComponent(parts[2]!)))
    }

    if (parts[0] === "api" && parts[1] === "replays") {
      const mod = await import("./replays-api.js")
      if (parts.length === 2 && req.method === "POST") return withCors(await mod.handleUploadReplay(req, env))
      if (parts.length === 3 && req.method === "GET")  return withCors(await mod.handleGetReplay(req, env, parts[2]!))
      if (parts.length === 3 && req.method === "DELETE") return withCors(await mod.handleDeleteReplay(req, env, parts[2]!))
      return withCors(new Response("not found", { status: 404 }))
    }

    if (parts[0] === "api" && parts[1] === "tables" && req.method === "POST") {
      const { handleCreateTable } = await import("./tables-api.js")
      return withCors(await handleCreateTable(req, env))
    }

    return withCors(new Response("not found", { status: 404 }))
  },
} satisfies ExportedHandler<Env>
