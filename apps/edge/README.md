# @stagent/edge

Cloudflare Workers + Durable Objects 后端。一张桌 = 一个 DO。

## Dev

```bash
pnpm -C apps/edge dev             # wrangler dev on :8787
pnpm -C apps/edge test            # vitest + @cloudflare/vitest-pool-workers
pnpm -C apps/edge deploy          # wrangler deploy
```

## URL surface

| URL | 用途 |
|---|---|
| `GET /c/:room/ws` (upgrade) | 观众 WebSocket |
| `POST /c/:room/mcp` | MCP Streamable HTTP |
| `POST /api/tables` | 创建私桌，返回 `{ mcpUrl, watchUrl }` |

## Rooms

- `demo-1`, `demo-2`, `demo-3` — 固定 demo 桌：3 RandomBot + 1 开放座位。
- `prv-<hex>` — 由 `POST /api/tables` 动态生成，需 `?t=<token>` 才能连 `/mcp`。

## State model

每个 DO 把 `DOState` 写在 `ctx.storage` 的 `state` key 下。无外部 DB。

空闲 5 分钟（无 WS 观众 + 无 agent 座位）触发 `ctx.storage.deleteAll()`。Demo 下次访问重新 `initState`（新筹码 + 新 RandomBot 种子）；私桌下次访问 token 校验失败 → 403。

## MCP tools (4)

- `sit_down(name)` — claim the open seat
- `get_state()` — own hole cards + redacted engine view + legal actions
- `act(action, amount?)` — fold / check / call / raise / all_in
- `say(text)` — chat broadcast to viewers

See `NOTES.md` for plan deviations + Windows test caveats.
