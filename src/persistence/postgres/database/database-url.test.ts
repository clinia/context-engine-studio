import path from "node:path";
import { describe, expect, it } from "vitest";
import { databaseUrlProblem, parseDatabaseUrl } from "./database-url";

describe("parseDatabaseUrl", () => {
  it.each(["postgres://user:password@localhost:5432/studio", "postgresql://localhost/studio"])(
    "opens a Postgres pool for %s",
    (url) => {
      expect(parseDatabaseUrl(url)).toEqual({ driver: "postgres", url });
    },
  );

  it("resolves a relative file: path against the working directory", () => {
    expect(parseDatabaseUrl("file:./.data/studio-db")).toEqual({
      driver: "pglite",
      dataDir: path.resolve(process.cwd(), ".data/studio-db"),
    });
  });

  it("accepts an absolute file:// path", () => {
    expect(parseDatabaseUrl("file:///var/lib/studio")).toEqual({
      driver: "pglite",
      dataDir: "/var/lib/studio",
    });
  });

  it.each([
    ["mysql://user:secret@host/db", "expected a postgres://"],
    ["./.data/studio-db", "expected a postgres://"],
    ["file:", "file: URL has no path"],
    ["postgres://user:pass@[bad", "malformed Postgres URL"],
  ])("rejects %s", (url, problem) => {
    expect(databaseUrlProblem(url)).toContain(problem);
    expect(() => parseDatabaseUrl(url)).toThrow(/^STUDIO_DATABASE_URL: /);
    expect(() => parseDatabaseUrl(url)).toThrow(problem);
  });

  it.each(["mysql://user:secret@host/db", "postgres://user:secret@[bad"])(
    "never echoes credentials from %s",
    (url) => {
      expect(databaseUrlProblem(url)).not.toContain("secret");
    },
  );
});
