import type { LoggerAdapter } from "@clinia/observability/server";

export const silentLogger: LoggerAdapter = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  child: () => silentLogger,
  flush: async () => {},
};
