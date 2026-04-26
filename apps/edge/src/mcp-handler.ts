import { TOOLS } from "./mcp-schemas.js"

interface JsonRpcReq {
  jsonrpc: "2.0"
  id: number | string | null
  method: string
  params?: any
}

export interface McpHandlerCtx {
  getSessionId: () => string | null
  newSessionId: () => string
  callTool: (name: string, args: any, sessionId: string) => Promise<any>
}

export async function handleMcpRequest(req: Request, ctx: McpHandlerCtx): Promise<Response> {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 })

  const body = await req.json<JsonRpcReq>()
  const { id, method, params } = body

  if (method === "initialize") {
    const sessionId = ctx.newSessionId()
    return Response.json(
      {
        jsonrpc: "2.0", id,
        result: {
          protocolVersion: "2025-03-26",
          capabilities: { tools: {} },
          serverInfo: { name: "stagent", version: "0.1.0" },
        },
      },
      { headers: { "Mcp-Session-Id": sessionId } },
    )
  }

  if (method === "tools/list") {
    return Response.json({ jsonrpc: "2.0", id, result: { tools: TOOLS } })
  }

  if (method === "tools/call") {
    const sid = ctx.getSessionId()
    if (!sid) {
      return Response.json({ jsonrpc: "2.0", id, error: { code: -32002, message: "no session" } })
    }
    try {
      const result = await ctx.callTool(params.name, params.arguments ?? {}, sid)
      return Response.json({
        jsonrpc: "2.0", id,
        result: { content: [{ type: "text", text: JSON.stringify(result) }] },
      })
    } catch (err: any) {
      return Response.json({
        jsonrpc: "2.0", id,
        result: { isError: true, content: [{ type: "text", text: err?.message ?? "unknown error" }] },
      })
    }
  }

  return Response.json({ jsonrpc: "2.0", id, error: { code: -32601, message: "Method not found" } })
}
