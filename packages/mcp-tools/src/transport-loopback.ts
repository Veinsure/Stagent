import type { ToolName, ToolInput, ToolOutput } from "./schema.js"

export type ToolHandler = (name: string, args: unknown, connId: string) => Promise<unknown>

/**
 * In-process transport. Server and client share a function reference.
 * Used by house-bot runner and the loopback dumb bot.
 */
export class LoopbackTransport {
  private handler: ToolHandler | null = null
  private connIdCounter = 0

  bindHandler(h: ToolHandler): void { this.handler = h }

  connect(): LoopbackConnection {
    if (!this.handler) throw new Error("loopback transport has no handler bound")
    return new LoopbackConnection(this.handler, `loopback-${++this.connIdCounter}`)
  }
}

export class LoopbackConnection {
  private ownerToken: string | null = null
  constructor(private handler: ToolHandler, public readonly connId: string) {}

  setOwnerToken(t: string): void { this.ownerToken = t }
  getOwnerToken(): string | null { return this.ownerToken }

  async call<T extends ToolName>(name: T, args: ToolInput<T>): Promise<ToolOutput<T>> {
    return (await this.handler(name, args, this.connId)) as ToolOutput<T>
  }
}
