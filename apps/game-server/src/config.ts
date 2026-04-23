export interface Config {
  databaseUrl: string
  port: number
  devSpawnBot: number
}

export function loadConfig(): Config {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error("DATABASE_URL is required")
  return {
    databaseUrl,
    port: Number(process.env.GAME_SERVER_PORT ?? 8080),
    devSpawnBot: Number(process.env.DEV_SPAWN_BOT ?? 0),
  }
}
