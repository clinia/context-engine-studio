/**
 * Readies the database, then starts the driver. A database that cannot be opened stops the server.
 * - Creates and migrates a PGlite database, so `pnpm dev` and `pnpm start` need no setup step.
 * - Leaves a Postgres database to `pnpm cli deps migrate`.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { configFromEnv, env } = await import("@/core/config");
  const { createConsoleLogger } = await import("@/core/logging/console-logger");
  const { prepareDatabase } = await import("@/persistence/postgres/database/database-manager");
  await prepareDatabase(configFromEnv(env).database, createConsoleLogger());

  const { getDriver } = await import("@/core/driver");
  await getDriver().start();
}
