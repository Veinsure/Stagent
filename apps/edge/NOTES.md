# apps/edge — implementation notes

## Windows: EBUSY on miniflare teardown

When running `vitest` on Windows, miniflare's cleanup of DO SQLite files
(`*.sqlite`, `*.sqlite-shm`, `*.sqlite-wal`) under `%TEMP%\miniflare-*` often
fails with `EBUSY: resource busy or locked, unlink ...`. The test process
exits non-zero **after** all tests have already passed.

This does **not** indicate a real test failure. To verify pass/fail, parse
the line `Tests  N passed (M)` rather than relying on exit code.

**Workaround in use:** `isolatedStorage: false`. Tests must use unique
room ids per case to avoid cross-test state leaks (e.g. router test uses
`router-test-mcp`, do-init uses `demo-1` and `prv-xyz123`).

CI plan: when porting to Linux runners, switch back to
`isolatedStorage: true` for stronger isolation.

## Plan deviations

- **Task 0 + Task 2 reorder:** plan ordered `Task 0` (spike) before `Task 2`
  (scaffold), but the spike test depends on `apps/edge/{package.json,
  wrangler.toml, vitest.config.ts}` from Task 2. Executed Task 2 → Task 0
  → Task 1 → Task 3+ instead.

- **Task 0 vitest config override:** `vitest.config.ts` temporarily set
  `main: "./src/spike-worker.ts"` to route `SELF` past the placeholder
  `worker.ts`. Reverted in Task 3 once `worker.ts` carries the real
  router.

- **Task 3 router tests:** plan asserted `status < 500` for two routes
  whose handlers (`tables-api` stub, DO with no MCP yet) correctly return
  `501`. Updated both to `not.toBe(404)` to express the routing-only
  intent. Also renamed the `/c/demo-1/mcp` test to use room id
  `router-test-mcp` so it doesn't share a DO with the do-init test under
  `isolatedStorage: false`.

- **Task 0 spike retired:** `apps/edge/src/spike-worker.ts` and
  `tests/spike-mcp-hello.test.ts` deleted in Task 4 once router landed —
  spike fetched `/mcp` directly, which now correctly 404s through the
  real router. Spike served its risk-validation purpose at Task 0 commit.

- **`tests/env.d.ts`:** added module augmentation
  `declare module "cloudflare:test" { interface ProvidedEnv extends Env }`
  so `env.TABLE` typechecks in tests.

## Compatibility date

`wrangler.toml` declares `compatibility_date = "2026-04-01"`. The
installed `workerd` only supports up to `2024-12-30` and prints a warning
falling back to that. No functional impact at this stage; revisit when
upgrading workerd.
