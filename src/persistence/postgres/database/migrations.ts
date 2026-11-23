import type { Migrator } from "@clinia/database-manager";
import { drizzleMigrator } from "@clinia/database-manager/postgres";
import type { LoggerAdapter } from "@clinia/observability/server";
import { sql } from "drizzle-orm";
import { readMigrationFiles } from "drizzle-orm/migrator";
import path from "node:path";
import type { ClientConfig } from "pg";
import type { StudioDatabase } from "./connection";

/** Resolved from the working directory, the package root under `next dev`, `next start` and `pnpm cli deps`. */
export const MIGRATIONS_DIR = path.join(process.cwd(), "migrations");

const latestMigrationMillis = new Map<string, number>();

function latestMigration(migrationsFolder: string): number {
  let latest = latestMigrationMillis.get(migrationsFolder);
  if (latest === undefined) {
    const migrations = readMigrationFiles({ migrationsFolder });
    latest = Math.max(0, ...migrations.map((m) => m.folderMillis));
    latestMigrationMillis.set(migrationsFolder, latest);
  }
  return latest;
}

/**
 * Whether every migration in `migrationsFolder` has been applied to `db`.
 * - A database no migration has run against is not current.
 * - A database ahead of the folder, migrated by a newer release, is current.
 */
export async function isSchemaCurrent(
  db: StudioDatabase,
  migrationsFolder = MIGRATIONS_DIR,
): Promise<boolean> {
  const latest = latestMigration(migrationsFolder);
  // Both drivers' results carry `rows`; the shared handle type does not say so.
  const rows = async <T>(query: ReturnType<typeof sql>) =>
    ((await db.execute(query)) as unknown as { rows: T[] }).rows;

  const [journal] = await rows<{ present: boolean }>(
    sql`select to_regclass('drizzle.__drizzle_migrations') is not null as present`,
  );
  if (!journal?.present) return latest === 0;
  const [applied] = await rows<{ last: string | number | null }>(
    sql`select max(created_at) as last from drizzle.__drizzle_migrations`,
  );
  return Number(applied?.last ?? 0) >= latest;
}

/** The studio's migration chain on a Postgres server. */
export function studioMigrator({
  config,
  logger,
  migrationsFolder = MIGRATIONS_DIR,
}: {
  config: ClientConfig;
  logger: LoggerAdapter;
  migrationsFolder?: string;
}): Migrator {
  return drizzleMigrator({ key: "studio", config, logger, migrationsFolder });
}
