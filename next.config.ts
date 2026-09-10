import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  output: "standalone",
  // Add the packages in transpilePackages because of standalone mode
  transpilePackages: ["@t3-oss/env-nextjs", "@t3-oss/env-core", "@clinia/context-engine-js"],
  // better-sqlite3 is a native addon — keep it external so Next doesn't try to
  // bundle its .node binary into the server build.
  serverExternalPackages: ["better-sqlite3"],
  experimental: {
    // Patient ingest batches (FHIR bundles + documents) routinely exceed the
    // 1 MB default for Server Action request bodies.
    serverActions: {
      bodySizeLimit: "25mb",
    },
    // Next 16.3 defaults to running `typescript/bin/tsc` for the build-time
    // type check. Our `typescript` dependency is aliased to the
    // `@typescript/typescript6` preview, which ships no `bin/tsc` (only
    // `bin/tsc6`), so the CLI-based check can't find it and the build fails.
    // Fall back to the TypeScript-API-based check, which resolves the alias
    // fine via `typescript/lib/typescript.js`.
    useTypeScriptCli: false,
  },
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
