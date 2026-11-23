import { Command } from "commander";
import z from "zod";
import {
  databaseUrlOption,
  databaseUrlOptionSchema,
  migrationFolderOption,
  migrationFolderOptionSchema,
} from "./flags";
import { createDatabaseManager } from "./helper";

const setupCommandOptionsSchema = z.object({
  ...databaseUrlOptionSchema.shape,
  ...migrationFolderOptionSchema.shape,
});

const setupCommand = new Command("setup")
  .description("Setup the database by creating it and running migrations")
  .addOption(databaseUrlOption)
  .addOption(migrationFolderOption)
  .action(async (rawOptions) => {
    const options = setupCommandOptionsSchema.parse(rawOptions);
    await createDatabaseManager(options.databaseUrl, options).setup();
  });

export { setupCommand };
