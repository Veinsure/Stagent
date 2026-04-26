import { env } from "cloudflare:test"

export async function newSession(room: string): Promise<string> {
  const stub = env.TABLE.get(env.TABLE.idFromName(room))
  await stub.fetch(`http://edge/c/${room}/__init`, { method: "POST" })
  const res = await stub.fetch(`http://edge/c/${room}/mcp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 0, method: "initialize", params: {} }),
  })
  return res.headers.get("Mcp-Session-Id")!
}

export async function callTool(
  room: string,
  sid: string,
  name: string,
  args: any,
  id: number = 1,
): Promise<any> {
  const stub = env.TABLE.get(env.TABLE.idFromName(room))
  const res = await stub.fetch(`http://edge/c/${room}/mcp`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Mcp-Session-Id": sid },
    body: JSON.stringify({ jsonrpc: "2.0", id, method: "tools/call", params: { name, arguments: args } }),
  })
  return res.json<any>()
}
