export { TableDO } from "./do-table.js"

export interface Env {
  TABLE: DurableObjectNamespace
}

export default {
  async fetch(_req: Request, _env: Env): Promise<Response> {
    return new Response("stagent-edge ok", { status: 200 })
  },
} satisfies ExportedHandler<Env>
