import "server-only";

import { mcpUrl } from "@/env/server";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { dynamicTool, jsonSchema } from "ai";

import { name as CLIENT_NAME, version as CLIENT_VERSION } from "../../../package.json";
import { tokenProvider } from "./auth";

/** Name of the MCP prompt that primes the clinical VFS agent. */
const VFS_AGENT_PROMPT = "vfs_agent";

/**
 * Tool arguments the studio injects server-side rather than exposing to the
 * model: `patient_id` scopes every call, and `session_id` (the chat id) lets
 * the server record the interaction against the engine session. Both are stripped
 * from the schema the model sees so it can't set — or hallucinate — them.
 */
const INJECTED_ARGS = ["patient_id", "session_id"] as const;

export type ContextEngineMcpTools = Record<string, ReturnType<typeof dynamicTool>>;

/** A connected, ephemeral engine MCP client plus the tools/prompt it exposed. */
export type ContextEngineMcpSession = {
  tools: ContextEngineMcpTools;
  /** The `vfs_agent` system prompt, or `null` if the server didn't provide one. */
  systemPrompt: string | null;
  /** Tears down the underlying transport. Always call once the stream finishes. */
  close: () => Promise<void>;
};

/** Drops the server-injected fields from a tool's JSON Schema `properties`/`required`. */
function hideInjectedArgs(schema: unknown): unknown {
  if (typeof schema !== "object" || schema === null) return schema;
  const s = schema as Record<string, unknown>;
  const properties = s.properties as Record<string, unknown> | undefined;
  if (!properties) return schema;

  const rest = { ...properties };
  for (const arg of INJECTED_ARGS) delete rest[arg];

  const required = Array.isArray(s.required)
    ? (s.required as string[]).filter((field) => !INJECTED_ARGS.includes(field as never))
    : s.required;

  return { ...s, properties: rest, required };
}

/** Flattens an MCP tool result's content blocks into the text the model receives. */
function toToolText(result: unknown): string {
  const content = ((result as { content?: unknown }).content ?? []) as Array<{
    type: string;
    text?: string;
  }>;
  return content
    .filter((c): c is { type: string; text: string } => c.type === "text" && c.text !== undefined)
    .map((c) => c.text)
    .join("\n");
}

/**
 * Opens a fresh connection to the (stateless) engine MCP server, discovers its
 * tools, and adapts them into AI SDK tools with `patient_id`/`session_id`
 * injected at execution time.
 *
 * The engine MCP server is stateless — it issues no session id and builds a fresh
 * server per request — so there is nothing to reuse across requests and no
 * singleton to cache. Each chat request opens its own session and must
 * {@link ContextEngineMcpSession.close} it once the model has finished streaming.
 */
export async function openContextEngineMcp(params: {
  patientId: string;
  sessionId?: string;
}): Promise<ContextEngineMcpSession> {
  const { patientId, sessionId } = params;

  // Attach the bearer token as a request header on the MCP transport. This
  // channel uses the MCP SDK rather than the REST client, so it can't reuse the
  // openapi-fetch middleware — it calls the shared provider directly.
  // `tokenProvider` is `undefined` in insecure mode (unsecured local server).
  const token = tokenProvider ? await tokenProvider() : null;
  const transport = new StreamableHTTPClientTransport(
    new URL(mcpUrl),
    token ? { requestInit: { headers: { Authorization: `Bearer ${token}` } } } : undefined,
  );
  // Identify ourselves to the engine from the manifest rather than from literals:
  // the version here was pinned at 0.1.0 while the package sat at 0.4.0, and a
  // bumped literal would just drift again at the next release.
  const client = new Client({ name: CLIENT_NAME, version: CLIENT_VERSION }, { capabilities: {} });
  await client.connect(transport);

  const [{ tools: toolDefs }, promptResp] = await Promise.all([
    client.listTools(),
    client.getPrompt({ name: VFS_AGENT_PROMPT, arguments: {} }).catch(() => null),
  ]);

  const systemPrompt =
    promptResp?.messages[0]?.content.type === "text" ? promptResp.messages[0].content.text : null;

  const tools: ContextEngineMcpTools = Object.fromEntries(
    toolDefs.map((t) => [
      t.name,
      dynamicTool({
        description: t.description ?? "",
        inputSchema: jsonSchema(
          hideInjectedArgs(t.inputSchema) as Parameters<typeof jsonSchema>[0],
        ),
        execute: async (input) => {
          const result = await client.callTool({
            name: t.name,
            arguments: {
              ...(input as Record<string, unknown>),
              patient_id: patientId,
              ...(sessionId ? { session_id: sessionId } : {}),
            },
          });
          return toToolText(result);
        },
      }),
    ]),
  );

  return { tools, systemPrompt, close: () => client.close() };
}
