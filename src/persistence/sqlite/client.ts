import { env } from "@/env/server";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

/** The shared SQLite handle type, typed with the full studio schema. */
export type SqliteDatabase = BetterSQLite3Database<typeof schema>;

/**
 * Migrations are generated to `migrations/` at the package root (see
 * `drizzle.config.ts`) and resolved from the working directory (`next dev`/
 * `next start` run from the package root). Kept cwd-relative rather than derived
 * from `import.meta.url`, which is unreliable once Next bundles the server code.
 */
const MIGRATIONS_DIR = path.join(process.cwd(), "migrations");

// Cache the connection on globalThis so Next's dev hot-reload reuses a single
// SQLite handle instead of opening (and re-migrating) a new one per reload.
const globalForSqlite = globalThis as unknown as { sqliteDb?: SqliteDatabase };

function createSqliteDatabase(): SqliteDatabase {
  const dbPath = path.resolve(process.cwd(), env.STUDIO_CHAT_DB_PATH);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  return db;
}

/** The shared, migrated SQLite handle backing every studio-local store. */
export function getSqliteDatabase(): SqliteDatabase {
  globalForSqlite.sqliteDb ??= createSqliteDatabase();
  return globalForSqlite.sqliteDb;
}
