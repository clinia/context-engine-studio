import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/pglite/migrator";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openPglite } from "./connection";
import { isSchemaCurrent } from "./migrations";

const MIGRATIONS = path.resolve(import.meta.dirname, "../../../../migrations");

describe("isSchemaCurrent", () => {
  let opened: ReturnType<typeof openPglite>;

  beforeEach(() => {
    opened = openPglite();
  });

  afterEach(async () => {
    await opened.close();
  });

  it("is false before any migration ran", async () => {
    expect(await isSchemaCurrent(opened.db, MIGRATIONS)).toBe(false);
  });

  it("is true once every migration is applied", async () => {
    await migrate(opened.db, { migrationsFolder: MIGRATIONS });

    expect(await isSchemaCurrent(opened.db, MIGRATIONS)).toBe(true);
  });

  it("is false while the latest migration is pending", async () => {
    await migrate(opened.db, { migrationsFolder: MIGRATIONS });
    await opened.db.execute(sql`update drizzle.__drizzle_migrations set created_at = 0`);

    expect(await isSchemaCurrent(opened.db, MIGRATIONS)).toBe(false);
  });
});
