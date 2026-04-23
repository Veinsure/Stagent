import { AsyncQueue, QueueClosedError } from "./async-queue.js"

interface Envelope<Cmd, R> {
  cmd: Cmd
  resolve: (value: R) => void
  reject: (error: Error) => void
}

export abstract class Actor<Cmd, R = void> {
  private queue = new AsyncQueue<Envelope<Cmd, R>>()
  private running = false
  private stopped = false

  abstract handle(cmd: Cmd): Promise<R>

  async start(): Promise<void> {
    if (this.running) throw new Error("actor already started")
    this.running = true
    while (this.running) {
      let env: Envelope<Cmd, R>
      try {
        env = await this.queue.pop()
      } catch (e) {
        if (e instanceof QueueClosedError) return
        throw e
      }
      try {
        const result = await this.handle(env.cmd)
        env.resolve(result)
      } catch (e) {
        env.reject(e instanceof Error ? e : new Error(String(e)))
      }
    }
  }

  enqueue(cmd: Cmd): Promise<R> {
    if (this.stopped) return Promise.reject(new Error("actor stopped"))
    return new Promise<R>((resolve, reject) => {
      try {
        this.queue.push({ cmd, resolve, reject })
      } catch (e) {
        reject(e as Error)
      }
    })
  }

  async stop(): Promise<void> {
    if (this.stopped) return
    this.stopped = true
    this.running = false
    this.queue.close()
  }
}
