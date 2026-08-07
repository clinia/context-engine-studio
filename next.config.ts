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
  },
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
