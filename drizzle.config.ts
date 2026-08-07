import { defineConfig } from "drizzle-kit";

/**
 * Studio-local chat store. SQLite for now; the schema is plain Drizzle so
 * switching `dialect` (e.g. to `postgresql`) later is a small change.
 */
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/persistence/sqlite/schema.ts",
  out: "./migrations",
});
