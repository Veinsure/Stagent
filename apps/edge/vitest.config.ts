import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config"

// Spike-only override: route SELF to spike-worker.ts. Will be removed in Task 3
// once worker.ts contains the real router.
export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        main: "./src/spike-worker.ts",
        wrangler: { configPath: "./wrangler.toml" },
        singleWorker: true,
      },
    },
  },
})
