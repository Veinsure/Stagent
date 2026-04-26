export class TableDO {
  constructor(private ctx: DurableObjectState, private env: unknown) {}
  async fetch(_req: Request): Promise<Response> {
    return new Response("DO stub", { status: 200 })
  }
}
