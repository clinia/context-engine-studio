import { Command } from "commander";
import { createCommand } from "./create";
import { dropCommand } from "./drop";
import { migrateCommand } from "./migrate";
import { resetCommand } from "./reset";
import { setupCommand } from "./setup";

const depsCommand = new Command("deps").description("Manage the studio database");

depsCommand.addCommand(createCommand);
depsCommand.addCommand(dropCommand);
depsCommand.addCommand(migrateCommand);
depsCommand.addCommand(resetCommand);
depsCommand.addCommand(setupCommand);

export { depsCommand };
