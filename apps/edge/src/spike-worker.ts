export default {
  async fetch(req: Request): Promise<Response> {
    if (req.method !== "POST") return new Response("MCP spike", { status: 200 })
    const body = await req.json<any>()
    const { id, method, params } = body

    if (method === "initialize") {
      return Response.json({
        jsonrpc: "2.0", id,
        result: {
          protocolVersion: "2025-03-26",
          capabilities: { tools: {} },
          serverInfo: { name: "stagent-spike", version: "0.0.0" },
        },
      }, { headers: { "Mcp-Session-Id": crypto.randomUUID() } })
    }
    if (method === "tools/list") {
      return Response.json({
        jsonrpc: "2.0", id,
        result: { tools: [{
          name: "echo",
          description: "Echo back input",
          inputSchema: { type: "object", properties: { text: { type: "string" } }, required: ["text"] },
        }] },
      })
    }
    if (method === "tools/call" && params?.name === "echo") {
      return Response.json({
        jsonrpc: "2.0", id,
        result: { content: [{ type: "text", text: params.arguments?.text ?? "" }] },
      })
    }
    return Response.json({ jsonrpc: "2.0", id, error: { code: -32601, message: "Method not found" } })
  },
}
