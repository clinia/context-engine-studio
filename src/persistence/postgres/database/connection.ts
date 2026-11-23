import { PGlite } from "@electric-sql/pglite";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle as drizzleNodePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite, type PgliteDatabase } from "drizzle-orm/pglite";
import fs from "node:fs";
import { Pool } from "pg";
import type { DatabaseTarget } from "./database-url";
import * as schema from "../schema";

/** The shared database handle type, the same for either driver. */
export type StudioDatabase = PgDatabase<PgQueryResultHKT, typeof schema>;

/** An open database. Disposable with `await using`. */
export interface DatabaseConnection<Db = StudioDatabase> extends AsyncDisposable {
  db: Db;
  close: () => Promise<void>;
}

/**
 * Opens the database without migrating it.
 * - A Postgres pool connects lazily, so an unreachable server surfaces on the first query.
 * @throws when a PGlite data directory cannot be created or written.
 */
export function openDatabase(target: DatabaseTarget): DatabaseConnection {
  if (target.driver === "pglite") return openPglite(target.dataDir);
  const pool = new Pool({ connectionString: target.url });
  const close = () => pool.end();
  return { db: drizzleNodePg({ client: pool, schema }), close, [Symbol.asyncDispose]: close };
}

/**
 * Opens PGlite in `dataDir`, or in memory without one.
 * - A data directory supports one process at a time.
 * @throws when `dataDir` cannot be created or written.
 */
export function openPglite(dataDir?: string): DatabaseConnection<PgliteDatabase<typeof schema>> {
  if (dataDir) ensureWritableDir(dataDir);
  const client = new PGlite(dataDir);
  const close = () => client.close();
  return { db: drizzlePglite({ client, schema }), close, [Symbol.asyncDispose]: close };
}

function ensureWritableDir(dir: string): void {
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.accessSync(dir, fs.constants.W_OK);
  } catch (cause) {
    throw new Error(`Studio data directory ${dir} is not writable: ${(cause as Error).message}`, {
      cause,
    });
  }
}
