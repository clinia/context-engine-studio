import { createEnv } from "@t3-oss/env-nextjs";
import z from "zod";

export const env = createEnv({
  server: {
    CLINIA_CONTEXT_ENGINE_API_URL: z.url(),
    ANTHROPIC_API_KEY: z.string().min(1),
    /**
     * Filesystem path to the local SQLite file that backs the studio's chat
     * history (sidebar list + reopen). Defaults to a gitignored file under the
     * package so a fresh checkout works with no extra setup.
     */
    STUDIO_CHAT_DB_PATH: z.string().min(1).default("./.data/studio-chats.db"),
    /**
     * Development affordance: send no `Authorization` header, which makes the
     * credentials below optional. For a locally-run Context Engine, which ships
     * with `security.enabled: false` and so accepts unauthenticated requests.
     *
     * Deliberately absent from the public configuration contract — a Clinia
     * workspace always requires authentication, so setting this against one only
     * converts a clear startup failure into 401s on every request.
     */
    CLINIA_CONTEXT_ENGINE_INSECURE: z.stringbool().default(false),
    /**
     * OAuth2 client-credentials for the workspace. Required unless
     * {@link CLINIA_CONTEXT_ENGINE_INSECURE} is set (enforced below rather than
     * in the schema, which validates each variable in isolation). Create these in
     * the Clinia Console with Read & Write access — the studio ingests data and
     * creates patients.
     */
    CLINIA_CONTEXT_ENGINE_OAUTH_CLIENT_ID: z.string().min(1).optional(),
    CLINIA_CONTEXT_ENGINE_OAUTH_CLIENT_SECRET: z.string().min(1).optional(),
    /**
     * Clinia's authorization server is the default, but the default lives in
     * `@clinia/context-engine-js` rather than here — the client applies it when
     * given neither a token URL nor an issuer, so a workspace needs only the
     * credentials above. Left unset these stay `undefined` and the client
     * decides, which keeps one source of truth for the endpoint.
     *
     * Overriding them is not part of the documented configuration contract; they
     * exist for authenticating against a different authorization server during
     * development.
     */
    CLINIA_CONTEXT_ENGINE_OAUTH_TOKEN_URL: z.url().optional(),
    /** RFC 8707 `resource` indicator; defaults with the token URL, in the client. */
    CLINIA_CONTEXT_ENGINE_OAUTH_RESOURCE: z.string().min(1).optional(),
    /**
     * Escape hatches for a non-Clinia authorization server. Setting an issuer
     * resolves the token endpoint by OIDC discovery instead of using
     * {@link CLINIA_CONTEXT_ENGINE_OAUTH_TOKEN_URL}.
     */
    CLINIA_CONTEXT_ENGINE_OAUTH_ISSUER: z.url().optional(),
    CLINIA_CONTEXT_ENGINE_OAUTH_AUDIENCE: z.string().min(1).optional(),
    CLINIA_CONTEXT_ENGINE_OAUTH_SCOPE: z.string().min(1).optional(),
  },
  experimental__runtimeEnv: process.env,
});

// Fail at startup rather than on the first request, which is almost always a
// deployment mistake worth surfacing immediately.
if (
  !env.CLINIA_CONTEXT_ENGINE_INSECURE &&
  !(env.CLINIA_CONTEXT_ENGINE_OAUTH_CLIENT_ID && env.CLINIA_CONTEXT_ENGINE_OAUTH_CLIENT_SECRET)
) {
  throw new Error(
    "Missing OAuth credentials: set CLINIA_CONTEXT_ENGINE_OAUTH_CLIENT_ID and " +
      "CLINIA_CONTEXT_ENGINE_OAUTH_CLIENT_SECRET, or set " +
      "CLINIA_CONTEXT_ENGINE_INSECURE=true to talk to an unsecured server you run yourself.",
  );
}

// An issuer resolves the token endpoint by discovery, so an explicitly set token
// URL alongside it would be silently ignored. Both are plain optionals now that
// the Clinia default lives in the client, so the parsed env distinguishes "set on
// purpose" from "unset" on its own.
if (env.CLINIA_CONTEXT_ENGINE_OAUTH_ISSUER && env.CLINIA_CONTEXT_ENGINE_OAUTH_TOKEN_URL) {
  throw new Error(
    "Ambiguous OAuth config: set either CLINIA_CONTEXT_ENGINE_OAUTH_ISSUER (token " +
      "endpoint resolved by discovery) or CLINIA_CONTEXT_ENGINE_OAUTH_TOKEN_URL, not both.",
  );
}

const stripTrailingSlash = (url: string) => url.replace(/\/$/, "");

/**
 * Resolved MCP endpoint. The stateless MCP route lives at `/mcp` on the Context
 * Engine server (same host as the REST API), so we derive it from
 * {@link env.CLINIA_CONTEXT_ENGINE_API_URL}.
 */
export const mcpUrl = `${stripTrailingSlash(env.CLINIA_CONTEXT_ENGINE_API_URL)}/mcp`;
