import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config"

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: "./wrangler.toml" },
        singleWorker: true,
        // Windows-only: per-test isolated storage triggers EBUSY when miniflare
        // tries to unlink DO SQLite files still held open by workerd. Tests use
        // unique room ids per case to avoid cross-test state leaks.
        isolatedStorage: false,
      },
    },
  },
})
