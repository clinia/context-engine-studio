import {
  DEFAULT_STUDIO_DATABASE_URL,
  databaseUrlProblem,
} from "@/persistence/postgres/database/database-url";
import { Option } from "commander";
import z from "zod";

export const databaseUrlOption = new Option(
  "-d, --database-url <url>",
  "postgres://, postgresql:// or file: URL of the studio database",
)
  .env("STUDIO_DATABASE_URL")
  .default(DEFAULT_STUDIO_DATABASE_URL);

// The infrastructure runs `deps` from the directory holding `migrations`; keep this default.
export const migrationFolderOption = new Option(
  "-m, --migrations-folder <path>",
  "Path to the migrations folder",
).default("migrations");

export const databaseUrlOptionSchema = z.object({
  databaseUrl: z.string().superRefine((url, ctx) => {
    const problem = databaseUrlProblem(url);
    if (problem) ctx.addIssue({ code: "custom", message: `--database-url: ${problem}` });
  }),
});

export const migrationFolderOptionSchema = z.object({
  migrationsFolder: z.string().default("migrations"),
});
