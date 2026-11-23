import { defaultRegistryDefinition, type StudioRegistryDefinition } from "@/core/ai";
import type { ClientCredentialsConfig } from "@clinia/context-engine-js";
import {
  parseDatabaseUrl,
  type DatabaseTarget,
} from "@/persistence/postgres/database/database-url";
import type { Env } from "./env";

/** The studio's configuration, built from the validated environment by {@link configFromEnv}. */
export type Config = {
  contextEngine: {
    apiUrl: string;
    /** `undefined` when the engine is reached without authentication. */
    credentials: ClientCredentialsConfig | undefined;
  };
  database: DatabaseTarget;
  ai: StudioRegistryDefinition;
};

export function configFromEnv(env: Env): Config {
  return {
    contextEngine: {
      apiUrl: env.CLINIA_CONTEXT_ENGINE_API_URL,
      credentials: credentialsFromEnv(env),
    },
    database: parseDatabaseUrl(env.STUDIO_DATABASE_URL),
    ai: defaultRegistryDefinition({ anthropicApiKey: env.ANTHROPIC_API_KEY }),
  };
}

function credentialsFromEnv(env: Env): ClientCredentialsConfig | undefined {
  const clientId = env.CLINIA_CONTEXT_ENGINE_OAUTH_CLIENT_ID;
  const clientSecret = env.CLINIA_CONTEXT_ENGINE_OAUTH_CLIENT_SECRET;
  // The env schema guarantees both are set unless we are in insecure mode.
  if (!clientId || !clientSecret) return undefined;

  const base = {
    clientId,
    clientSecret,
    resource: env.CLINIA_CONTEXT_ENGINE_OAUTH_RESOURCE,
    audience: env.CLINIA_CONTEXT_ENGINE_OAUTH_AUDIENCE,
    scope: env.CLINIA_CONTEXT_ENGINE_OAUTH_SCOPE,
  };

  // An issuer resolves the token endpoint by discovery; otherwise pass the token
  // endpoint through, which is `undefined` unless someone overrode it — the
  // client then applies Clinia's, along with the matching `resource`. The env
  // schema rejects both being set, so this order discards no real setting.
  const issuer = env.CLINIA_CONTEXT_ENGINE_OAUTH_ISSUER;
  return issuer
    ? { ...base, issuer }
    : { ...base, tokenUrl: env.CLINIA_CONTEXT_ENGINE_OAUTH_TOKEN_URL };
}
