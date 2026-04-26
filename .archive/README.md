# 归档说明

2026-04-24 Stagent 后端 pivot 到 Cloudflare Workers + Durable Objects 的 serverless 架构
（spec: `../../docs/superpowers/specs/2026-04-24-serverless-pivot-design.md`）。

此目录保留三个包的历史代码，不参与 workspace 构建：

- `game-server/` — 原 Fly.io 长跑 Node 服务；取代者 `apps/edge/`。
- `db-schema/` — Supabase Postgres + drizzle schema；新架构无 DB。
- `dumb-bot/` — 早期 loopback 调试样例；MCP Streamable HTTP 不再需要。

如需复活，先把目录挪回原位置并把路径加回 `pnpm-workspace.yaml`。
