import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { openPglite } from "./connection";

describe("openPglite", () => {
  it.skipIf(process.getuid?.() === 0)("names an unwritable data directory", async () => {
    const parent = fs.mkdtempSync(path.join(os.tmpdir(), "studio-db-"));
    fs.chmodSync(parent, 0o500);
    const dataDir = path.join(parent, "db");
    try {
      expect(() => openPglite(dataDir)).toThrow(`Studio data directory ${dataDir} is not writable`);
    } finally {
      fs.chmodSync(parent, 0o700);
      fs.rmSync(parent, { recursive: true });
    }
  });

  it("closes on dispose", async () => {
    let db;
    {
      await using connection = openPglite();
      db = connection.db;
      await expect(db.execute("select 1")).resolves.toBeDefined();
    }
    await expect(db.execute("select 1")).rejects.toThrow();
  });
});
