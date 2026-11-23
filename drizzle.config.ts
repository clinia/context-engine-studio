import { defineConfig } from "drizzle-kit";

/** Studio-local tables, run on PGlite or a Postgres server. */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/persistence/postgres/schema.ts",
  out: "./migrations",
});
