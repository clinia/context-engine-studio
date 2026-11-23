import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultRegistryDefinition } from "@/core/ai";
import type { Config } from "@/core/config";
import type { HealthReport } from "@/core/health/health-check";
import { migrate } from "drizzle-orm/pglite/migrator";
import { openPglite } from "@/persistence/postgres/database/connection";
import { DefaultDriver } from "./default-driver";

// The driver module reads the app's environment, and resolves `migrations` from the working
// directory, on import.
vi.hoisted(() => {
  vi.spyOn(process, "cwd").mockReturnValue(`${import.meta.dirname}/../../..`);
  process.env.CLINIA_CONTEXT_ENGINE_API_URL ??= "http://localhost:8080";
  process.env.ANTHROPIC_API_KEY ??= "test";
  process.env.CLINIA_CONTEXT_ENGINE_INSECURE ??= "true";
});

const MIGRATIONS = path.resolve(import.meta.dirname, "../../../migrations");

const config = (database: Config["database"]): Config => ({
  contextEngine: { apiUrl: "http://localhost:8080", credentials: undefined },
  database,
  ai: defaultRegistryDefinition({ anthropicApiKey: "test" }),
});

const PGLITE_BOOT_MS = 20_000;

// PGlite boots on the driver's first query, which can take longer than the check's timeout.
// Until it is up, the check answers `database unavailable`.
async function expectOnceBooted(driver: DefaultDriver, report: HealthReport): Promise<void> {
  await vi.waitFor(async () => expect(await driver.getHealthCheck().check()).toEqual(report), {
    timeout: PGLITE_BOOT_MS,
    interval: 100,
  });
}

describe("DefaultDriver health check", () => {
  let parent: string;
  let dataDir: string;

  beforeEach(() => {
    parent = fs.mkdtempSync(path.join(os.tmpdir(), "studio-db-"));
    dataDir = path.join(parent, "db");
  });

  afterEach(() => {
    fs.rmSync(parent, { recursive: true, force: true });
  });

  it(
    "fails the check against an unmigrated database",
    { timeout: PGLITE_BOOT_MS * 2 },
    async () => {
      const driver = new DefaultDriver(config({ driver: "pglite", dataDir }));
      try {
        await expectOnceBooted(driver, { healthy: false, problem: "database schema out of date" });
      } finally {
        await driver.close();
      }
    },
  );

  it("passes against a migrated database", { timeout: PGLITE_BOOT_MS * 2 }, async () => {
    {
      await using connection = openPglite(dataDir);
      await migrate(connection.db, { migrationsFolder: MIGRATIONS });
    }
    const driver = new DefaultDriver(config({ driver: "pglite", dataDir }));
    try {
      await expectOnceBooted(driver, { healthy: true });
    } finally {
      await driver.close();
    }
  });

  it("hands out models only once started", async () => {
    const driver = new DefaultDriver(
      config({ driver: "postgres", url: "postgres://postgres:postgres@127.0.0.1:1/studio" }),
    );
    try {
      expect(() => driver.getModels()).toThrow(/not started/);

      await Promise.all([driver.start(), driver.start()]);

      expect(driver.getModels().languageModel("chat").modelId).toBe("claude-opus-4-8");
    } finally {
      await driver.close();
    }
  });

  it("fails the check against an unreachable database", async () => {
    const driver = new DefaultDriver(
      config({ driver: "postgres", url: "postgres://postgres:postgres@127.0.0.1:1/studio" }),
    );
    try {
      expect(await driver.getHealthCheck().check()).toEqual({
        healthy: false,
        problem: "database unavailable",
      });
    } finally {
      await driver.close();
    }
  });
});
