export interface HouseBotsConfig {
  enabled: boolean
  personas: Array<{ name: string; count: number }>
  llm_budget_usd_per_persona: number
  idle_pause_ms: number
  target_seats_per_table: number
  anthropic_api_key?: string
  openai_api_key?: string
}

export interface Config {
  databaseUrl: string
  port: number
  devSpawnBot: number
  dbSearchPath: string | undefined
  houseBots: HouseBotsConfig
}

function parseHouseBots(raw: string | undefined): HouseBotsConfig["personas"] {
  if (!raw) return []
  return raw.split(",").map((s) => s.trim()).filter(Boolean).map((entry) => {
    const [name, count] = entry.split(":")
    if (!name || count === undefined) throw new Error(`bad HOUSE_BOTS entry: ${entry}`)
    const n = Number(count)
    if (!Number.isInteger(n) || n < 0) throw new Error(`bad count in HOUSE_BOTS entry: ${entry}`)
    return { name, count: n }
  })
}

export function loadConfig(): Config {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error("DATABASE_URL is required")
  return {
    databaseUrl,
    port: Number(process.env.GAME_SERVER_PORT ?? 8080),
    devSpawnBot: Number(process.env.DEV_SPAWN_BOT ?? 0),
    dbSearchPath: process.env.DB_SEARCH_PATH,
    houseBots: {
      enabled: process.env.HOUSE_BOTS_ENABLED === "1",
      personas: parseHouseBots(process.env.HOUSE_BOTS),
      llm_budget_usd_per_persona: Number(process.env.LLM_BUDGET_USD_PER_PERSONA ?? 5),
      idle_pause_ms: Number(process.env.IDLE_PAUSE_MS ?? 300_000),
      target_seats_per_table: Number(process.env.TARGET_SEATS_PER_TABLE ?? 3),
      ...(process.env.ANTHROPIC_API_KEY ? { anthropic_api_key: process.env.ANTHROPIC_API_KEY } : {}),
      ...(process.env.OPENAI_API_KEY ? { openai_api_key: process.env.OPENAI_API_KEY } : {}),
    },
  }
}
