import { Command } from "commander";
import z from "zod";
import { databaseUrlOption, databaseUrlOptionSchema } from "./flags";
import { createDatabaseManager } from "./helper";

const dropCommandOptionsSchema = z.object({
  ...databaseUrlOptionSchema.shape,
});

const dropCommand = new Command("drop")
  .description("Drop the database")
  .addOption(databaseUrlOption)
  .action(async (rawOptions) => {
    const options = dropCommandOptionsSchema.parse(rawOptions);
    // Creating or dropping a database runs no migration, so the folder is never read.
    const manager = createDatabaseManager(options.databaseUrl, { migrationsFolder: "noop" });
    await manager.dropDatabase();
  });

export { dropCommand };
