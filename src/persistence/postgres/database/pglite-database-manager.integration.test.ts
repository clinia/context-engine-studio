import { sql } from "drizzle-orm";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openPglite, type StudioDatabase } from "./connection";
import { isSchemaCurrent } from "./migrations";
import { PgliteDatabaseManager } from "./pglite-database-manager";
import { silentLogger } from "./testing";

const MIGRATIONS = path.resolve(import.meta.dirname, "../../../../migrations");

describe("PgliteDatabaseManager", () => {
  let parent: string;
  let dataDir: string;
  let manager: PgliteDatabaseManager;

  const inspect = async <T>(fn: (db: StudioDatabase) => Promise<T>) => {
    await using connection = openPglite(dataDir);
    return await fn(connection.db);
  };

  beforeEach(() => {
    parent = fs.mkdtempSync(path.join(os.tmpdir(), "studio-db-"));
    dataDir = path.join(parent, "db");
    manager = new PgliteDatabaseManager({
      dataDir,
      logger: silentLogger,
      migrationsFolder: MIGRATIONS,
    });
  });

  afterEach(() => {
    fs.rmSync(parent, { recursive: true, force: true });
  });

  it("sets up a migrated database", async () => {
    await manager.setup();

    expect(await inspect((db) => isSchemaCurrent(db, MIGRATIONS))).toBe(true);
  });

  it("applies each migration once across runs", async () => {
    await manager.setup();
    await manager.migrate();

    const { rows } = (await inspect((db) =>
      db.execute(sql`select count(*)::int as count from drizzle.__drizzle_migrations`),
    )) as unknown as { rows: { count: number }[] };
    expect(rows[0]?.count).toBe(1);
  });

  it("refuses to create over an existing database", async () => {
    await manager.createDatabase();

    await expect(manager.createDatabase()).rejects.toThrow("a database already exists");
  });

  it("creates a missing database on ensureDatabase and leaves an existing one", async () => {
    await manager.ensureDatabase();
    await manager.migrate();
    await manager.ensureDatabase();

    expect(await inspect((db) => isSchemaCurrent(db, MIGRATIONS))).toBe(true);
  });

  it("removes the data directory on drop", async () => {
    await manager.setup();
    await manager.dropDatabase();

    expect(fs.existsSync(dataDir)).toBe(false);
  });
});
