import { Command } from "commander";
import { depsCommand } from "./deps";

const rootCommand = new Command();

rootCommand.name("studio").description("Context Engine Studio");

rootCommand.addCommand(depsCommand);

rootCommand.parseAsync(process.argv).catch((error: unknown) => {
  // oxlint-disable-next-line no-console -- the CLI reports a failed command on stderr
  console.error(error);
  process.exitCode = 1;
});
