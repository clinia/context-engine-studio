import path from "node:path";

/**
 * Where the studio database lives.
 * - `pglite` without a `dataDir` runs in memory; no connection string produces it.
 */
export type DatabaseTarget =
  { driver: "pglite"; dataDir?: string } | { driver: "postgres"; url: string };

/** PGlite in a gitignored directory under the package. */
export const DEFAULT_STUDIO_DATABASE_URL = "file:./.data/studio-db";

function filePath(url: string) {
  return url.replace(/^file:(\/\/)?/, "");
}

/**
 * Returns an error message when `url` is not a supported connection string.
 * - The message never includes the URL, which may carry a password.
 */
export function databaseUrlProblem(url: string): string | undefined {
  if (url.startsWith("file:")) return filePath(url) ? undefined : "file: URL has no path";
  if (/^postgres(ql)?:\/\//.test(url))
    return URL.canParse(url) ? undefined : "malformed Postgres URL";
  return "expected a postgres://, postgresql:// or file: URL";
}

/**
 * Maps a connection string to a {@link DatabaseTarget}.
 * - `postgres://` and `postgresql://` open a node-postgres pool.
 * - `file:<path>` and `file://<path>` open PGlite at `<path>`, relative to the working directory.
 * @throws when {@link databaseUrlProblem} reports a problem.
 */
export function parseDatabaseUrl(url: string): DatabaseTarget {
  const problem = databaseUrlProblem(url);
  if (problem) throw new Error(`STUDIO_DATABASE_URL: ${problem}`);
  if (url.startsWith("file:")) {
    return { driver: "pglite", dataDir: path.resolve(process.cwd(), filePath(url)) };
  }
  return { driver: "postgres", url };
}
