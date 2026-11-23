import { PostgresDatabaseManager } from "@clinia/database-manager/postgres";
import { describe, expect, it } from "vitest";
import { silentLogger } from "./testing";
import { createDatabaseManager } from "./database-manager";
import { PgliteDatabaseManager } from "./pglite-database-manager";

describe("createDatabaseManager", () => {
  it("manages PGlite for a data directory", () => {
    expect(
      createDatabaseManager(
        { driver: "pglite", dataDir: "/tmp/studio-db" },
        { logger: silentLogger },
      ),
    ).toBeInstanceOf(PgliteDatabaseManager);
  });

  it("manages Postgres for a server", () => {
    expect(
      createDatabaseManager(
        { driver: "postgres", url: "postgres://postgres:postgres@localhost:5432/studio" },
        { logger: silentLogger },
      ),
    ).toBeInstanceOf(PostgresDatabaseManager);
  });

  it("refuses an in-memory PGlite database", () => {
    expect(() => createDatabaseManager({ driver: "pglite" }, { logger: silentLogger })).toThrow(
      "cannot be managed",
    );
  });
});
