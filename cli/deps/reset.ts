import { Command } from "commander";
import z from "zod";
import {
  databaseUrlOption,
  databaseUrlOptionSchema,
  migrationFolderOption,
  migrationFolderOptionSchema,
} from "./flags";
import { createDatabaseManager } from "./helper";

const resetCommandOptionsSchema = z.object({
  ...databaseUrlOptionSchema.shape,
  ...migrationFolderOptionSchema.shape,
});

const resetCommand = new Command("reset")
  .description("Reset the database by dropping, recreating, and migrating it")
  .addOption(databaseUrlOption)
  .addOption(migrationFolderOption)
  .action(async (rawOptions) => {
    const options = resetCommandOptionsSchema.parse(rawOptions);
    await createDatabaseManager(options.databaseUrl, options).reset();
  });

export { resetCommand };
