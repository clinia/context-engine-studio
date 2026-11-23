import { Command } from "commander";
import z from "zod";
import { databaseUrlOption, databaseUrlOptionSchema } from "./flags";
import { createDatabaseManager } from "./helper";

const createCommandOptionsSchema = z.object({
  ...databaseUrlOptionSchema.shape,
});

const createCommand = new Command("create")
  .description("Create the database")
  .addOption(databaseUrlOption)
  .action(async (rawOptions) => {
    const options = createCommandOptionsSchema.parse(rawOptions);
    // Creating or dropping a database runs no migration, so the folder is never read.
    const manager = createDatabaseManager(options.databaseUrl, { migrationsFolder: "noop" });
    await manager.createDatabase();
  });

export { createCommand };
