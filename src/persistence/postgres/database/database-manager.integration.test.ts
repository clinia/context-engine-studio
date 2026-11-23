import { sql } from "drizzle-orm";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { openPglite } from "./connection";
import { prepareDatabase } from "./database-manager";
import { isSchemaCurrent } from "./migrations";
import { silentLogger } from "./testing";

// `prepareDatabase` migrates from the default folder, resolved from the working directory.
vi.hoisted(() => {
  vi.spyOn(process, "cwd").mockReturnValue(`${import.meta.dirname}/../../../..`);
});

describe("prepareDatabase", () => {
  let parent: string;
  let dataDir: string;

  beforeEach(() => {
    parent = fs.mkdtempSync(path.join(os.tmpdir(), "studio-db-"));
    dataDir = path.join(parent, "db");
  });

  afterEach(() => {
    fs.rmSync(parent, { recursive: true, force: true });
  });

  it("creates and migrates a PGlite database, and is a no-op the second time", async () => {
    await prepareDatabase({ driver: "pglite", dataDir }, silentLogger);
    await prepareDatabase({ driver: "pglite", dataDir }, silentLogger);

    await using connection = openPglite(dataDir);
    expect(await isSchemaCurrent(connection.db)).toBe(true);
    const { rows } = await connection.db.execute<{ n: number }>(
      sql`select count(*)::int as n from drizzle.__drizzle_migrations`,
    );
    const migrations = fs.readdirSync(path.join(import.meta.dirname, "../../../../migrations"));
    expect(rows[0]?.n).toBe(migrations.filter((f) => f.endsWith(".sql")).length);
  });

  it("rejects when Postgres is unreachable", async () => {
    await expect(
      prepareDatabase(
        { driver: "postgres", url: "postgres://postgres:postgres@127.0.0.1:1/studio" },
        silentLogger,
      ),
    ).rejects.toThrow();
  });
});
