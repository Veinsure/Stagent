import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql"

let container: StartedPostgreSqlContainer | null = null

export async function setup() {
  container = await new PostgreSqlContainer("postgres:16-alpine")
    .withDatabase("stagent_test")
    .withUsername("stagent")
    .withPassword("stagent")
    .start()
  process.env.TEST_DATABASE_URL = container.getConnectionUri()
}

export async function teardown() {
  if (container) await container.stop()
}
