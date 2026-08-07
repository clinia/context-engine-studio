import "server-only";

import { env } from "@/env/server";
import {
  createClientCredentialsTokenProvider,
  type TokenProvider,
} from "@clinia/context-engine-js";

/**
 * Shared OAuth token provider for the workspace.
 *
 * A single module-level instance is reused across both server channels — the
 * REST client ({@link ./server}) and the MCP transport
 * ({@link ./mcp}) — so the access token is fetched once and its
 * cache/refresh is shared rather than duplicated per channel.
 *
 * `undefined` only when `CLINIA_CONTEXT_ENGINE_INSECURE` is set, in which case
 * callers attach no `Authorization` header. That is a development path against a
 * locally-run engine, which has security disabled by default. Every other
 * configuration has a provider — the env schema requires the credentials.
 */
function buildTokenProvider(): TokenProvider | undefined {
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
    ? createClientCredentialsTokenProvider({ ...base, issuer })
    : createClientCredentialsTokenProvider({
        ...base,
        tokenUrl: env.CLINIA_CONTEXT_ENGINE_OAUTH_TOKEN_URL,
      });
}

export const tokenProvider: TokenProvider | undefined = buildTokenProvider();
