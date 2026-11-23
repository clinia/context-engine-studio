import type { DatabaseManager } from "@clinia/database-manager";
import { PostgresDatabaseManager, clientConfigFrom } from "@clinia/database-manager/postgres";
import type { LoggerAdapter } from "@clinia/observability/server";
import type { DatabaseTarget } from "./database-url";
import { MIGRATIONS_DIR, isSchemaCurrent, studioMigrator } from "./migrations";
import { openDatabase } from "./connection";
import { PgliteDatabaseManager } from "./pglite-database-manager";

/**
 * The manager for `target`: PGlite for a data directory, Postgres for a server.
 * @throws for an in-memory PGlite target, which has nothing to manage.
 */
export function createDatabaseManager(
  target: DatabaseTarget,
  {
    logger,
    migrationsFolder = MIGRATIONS_DIR,
  }: { logger: LoggerAdapter; migrationsFolder?: string },
): DatabaseManager {
  if (target.driver === "pglite") {
    if (!target.dataDir) throw new Error("an in-memory PGlite database cannot be managed");
    return new PgliteDatabaseManager({ dataDir: target.dataDir, logger, migrationsFolder });
  }
  const config = clientConfigFrom(target.url);
  return new PostgresDatabaseManager({
    config,
    logger,
    migrators: [studioMigrator({ config, logger, migrationsFolder })],
  });
}

/**
 * Readies the database for the server, before it opens its own connection.
 * - Creates and migrates a PGlite database.
 * - Never migrates Postgres; logs a warning when migrations are pending.
 * @throws when the database cannot be opened or queried.
 */
export async function prepareDatabase(
  target: DatabaseTarget,
  logger: LoggerAdapter,
): Promise<void> {
  if (target.driver === "pglite") {
    const manager = createDatabaseManager(target, { logger });
    await manager.ensureDatabase();
    await manager.migrate();
    return;
  }
  await using connection = openDatabase(target);
  if (!(await isSchemaCurrent(connection.db))) {
    logger.warn("The studio database has pending migrations; run `pnpm cli deps migrate`.");
  }
}
