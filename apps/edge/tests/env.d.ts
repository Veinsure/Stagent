import type { Env } from "../src/worker.js"

declare module "cloudflare:test" {
  interface ProvidedEnv extends Env {}
}
