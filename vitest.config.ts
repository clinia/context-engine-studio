import path from "node:path";
import { defaultExclude, defineConfig } from "vitest/config";

function fromHere(p: string) {
  return path.resolve(import.meta.dirname, p);
}

export default defineConfig({
  resolve: {
    alias: {
      "@": fromHere("src"),
      // Next resolves `server-only` itself; it throws on import anywhere else.
      "server-only": fromHere("node_modules/next/dist/compiled/server-only/empty.js"),
    },
  },
  esbuild: { jsx: "automatic" },
  test: {
    name: "studio",
    include: [fromHere("src/**/*.test.{ts,tsx}"), fromHere("cli/**/*.test.ts")],
    exclude: [fromHere("**/*.integration.test.ts"), ...defaultExclude],
  },
});
