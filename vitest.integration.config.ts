import path from "node:path";
import { defineConfig } from "vitest/config";

function fromHere(p: string) {
  return path.resolve(import.meta.dirname, p);
}

// Runs against in-process PGlite and a temporary directory; needs no container.
export default defineConfig({
  resolve: {
    alias: {
      "@": fromHere("src"),
      // Next resolves `server-only` itself; it throws on import anywhere else.
      "server-only": fromHere("node_modules/next/dist/compiled/server-only/empty.js"),
    },
  },
  test: {
    name: "studio-integration",
    include: [fromHere("src/**/*.integration.test.ts"), fromHere("cli/**/*.integration.test.ts")],
  },
});
