/* oxlint-disable no-console -- a logger that writes to the console */
import type { LoggerAdapter } from "@clinia/observability/server";

/** Logs to the console, with `bindings` and each call's attributes appended to the message. */
export function createConsoleLogger(bindings: Record<string, unknown> = {}): LoggerAdapter {
  const log =
    (write: (...data: unknown[]) => void) =>
    (message: string, args: Record<string, unknown> = {}) => {
      const attributes = { ...bindings, ...args };
      if (Object.keys(attributes).length === 0) write(message);
      else write(message, attributes);
    };
  return {
    debug: log(console.debug),
    info: log(console.info),
    warn: log(console.warn),
    error: log(console.error),
    child: (more) => createConsoleLogger({ ...bindings, ...more }),
    flush: async () => {},
  };
}
