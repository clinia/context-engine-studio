import type { DatabaseManager } from "@clinia/database-manager";
import { createConsoleLogger } from "@/core/logging/console-logger";
import { createDatabaseManager as createManager } from "@/persistence/postgres/database/database-manager";
import { parseDatabaseUrl } from "@/persistence/postgres/database/database-url";

/** The manager for the database `databaseUrl` names, logging to the console. */
export function createDatabaseManager(
  databaseUrl: string,
  { migrationsFolder }: { migrationsFolder: string },
): DatabaseManager {
  return createManager(parseDatabaseUrl(databaseUrl), {
    logger: createConsoleLogger(),
    migrationsFolder,
  });
}
