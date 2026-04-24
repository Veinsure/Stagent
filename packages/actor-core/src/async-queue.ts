export class QueueClosedError extends Error {
  constructor() {
    super("queue closed")
    this.name = "QueueClosedError"
  }
}

export class AsyncQueue<T> {
  private items: T[] = []
  private waiters: Array<{ resolve: (v: T) => void; reject: (e: Error) => void }> = []
  private closed = false

  push(item: T): void {
    if (this.closed) throw new QueueClosedError()
    const waiter = this.waiters.shift()
    if (waiter) waiter.resolve(item)
    else this.items.push(item)
  }

  pop(): Promise<T> {
    if (this.closed) return Promise.reject(new QueueClosedError())
    const item = this.items.shift()
    if (item !== undefined) return Promise.resolve(item)
    return new Promise((resolve, reject) => {
      this.waiters.push({ resolve, reject })
    })
  }

  close(): void {
    if (this.closed) return
    this.closed = true
    for (const w of this.waiters) w.reject(new QueueClosedError())
    this.waiters = []
  }

  get size(): number { return this.items.length }
  get isClosed(): boolean { return this.closed }
}
