import { Command } from "commander";
import z from "zod";
import {
  databaseUrlOption,
  databaseUrlOptionSchema,
  migrationFolderOption,
  migrationFolderOptionSchema,
} from "./flags";
import { createDatabaseManager } from "./helper";

const migrateCommandOptionsSchema = z.object({
  ...databaseUrlOptionSchema.shape,
  ...migrationFolderOptionSchema.shape,
});

const migrateCommand = new Command("migrate")
  .description("Run database migrations, creating the database if it does not exist yet")
  .addOption(databaseUrlOption)
  .addOption(migrationFolderOption)
  .action(async (rawOptions) => {
    const options = migrateCommandOptionsSchema.parse(rawOptions);
    const manager = createDatabaseManager(options.databaseUrl, options);
    await manager.ensureDatabase();
    await manager.migrate();
  });

export { migrateCommand };
