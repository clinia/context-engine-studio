"use server";

import { serverClient } from "@/lib/context-engine-client/server";
import { err, errorMessage, ok, type Result } from "@/lib/result";
import type {
  BrowseResult,
  IngestBatchBody,
  IngestExecutionDetail,
  IngestExecutionEnvelope,
  Patient,
  PatientList,
  ReadResponse,
  Session,
} from "@clinia/context-engine-js";

/** Output format for {@link readVfs}; mirrors the `format` query of the read endpoint. */
export type VfsFormat = "narrative" | "structured" | "compact";

export type PatientListItem = PatientList[number];

/** Wraps an openapi-fetch `{ data, error }` response into a {@link Result}. */
function toResult<T>(data: T | undefined, error: unknown): Result<T> {
  if (error) return err(errorMessage(error));
  if (data === undefined) return err("No data returned from the Context Engine API.");
  return ok(data);
}

/**
 * Loads the patients currently registered in the Context Engine API.
 *
 * The `GET /v1/patients` endpoint returns the full list in a single response
 * (no pagination), so this is the complete set of patients.
 */
export async function listPatients(): Promise<PatientListItem[]> {
  const { data } = await serverClient.http.GET("/v1/patients", {});
  return data ?? [];
}

/**
 * Creates the patient entry if it does not exist, or returns the
 * existing record unchanged. Idempotent.
 */
export async function upsertPatient(patientId: string): Promise<Result<Patient>> {
  const { data, error } = await serverClient.http.PUT("/v1/patients/{patientId}", {
    params: { path: { patientId } },
  });
  return toResult(data, error);
}

/**
 * Idempotently opens the engine session for a caller-provided id: creates the row
 * if new, or returns the existing session unchanged. Safe to call on every chat
 * turn. Opening the session is what lets the server record the transcript of the
 * MCP tool calls that carry this `sessionId`.
 */
export async function upsertSession(
  patientId: string,
  sessionId: string,
): Promise<Result<Session>> {
  const { data, error } = await serverClient.http.PUT(
    "/v1/patients/{patientId}/sessions/{sessionId}",
    { params: { path: { patientId, sessionId } } },
  );
  return toResult(data, error);
}

/**
 * Appends user/assistant turns to an open session's transcript, in order. Used to
 * persist the chat conversation server-side so memory generation sees what was said.
 */
export async function appendMessages(
  patientId: string,
  sessionId: string,
  messages: PersistedMessage[],
): Promise<Result<{ ok: boolean; messageCount: number }>> {
  const { data, error } = await serverClient.http.POST(
    "/v1/patients/{patientId}/sessions/{sessionId}/messages",
    { params: { path: { patientId, sessionId } }, body: { messages } },
  );
  return toResult(data, error);
}

/**
 * Removes a patient and all associated entities, events, and relationships from
 * the registry. Irreversible. Resolves to `ok` on a 204, including when the
 * patient was already gone (treated as success by the API contract).
 */
export async function deletePatient(patientId: string): Promise<Result<true>> {
  const { error } = await serverClient.http.DELETE("/v1/patients/{patientId}", {
    params: { path: { patientId } },
  });
  if (error) return err(errorMessage(error));
  return ok(true);
}

/**
 * Submits a batch of FHIR bundles, CDA documents, and/or document registrations
 * for a patient. `wait` blocks up to that many ms for the execution to reach a
 * terminal status before returning.
 */
export async function ingestBatch(
  patientId: string,
  body: IngestBatchBody,
  wait = 30000,
): Promise<Result<IngestExecutionEnvelope>> {
  const { data, error } = await serverClient.http.POST("/v1/patients/{patientId}/ingest", {
    params: { path: { patientId }, query: { wait } },
    body,
  });
  return toResult(data, error);
}

/** Retrieves the full detail (including current status) of an ingest execution. */
export async function getExecution(
  patientId: string,
  executionId: string,
): Promise<Result<IngestExecutionDetail>> {
  const { data, error } = await serverClient.http.GET(
    "/v1/patients/{patientId}/ingest/executions/{executionId}",
    { params: { path: { patientId, executionId } } },
  );
  return toResult(data, error);
}

/**
 * Lists the immediate children of a node in a patient's virtual file system.
 *
 * The VFS is lazy: a single call returns only the direct children of `path`
 * (the root when `path` is omitted), so callers fetch deeper levels on demand
 * as the user expands folders.
 */
export async function browseVfs(patientId: string, path?: string): Promise<Result<BrowseResult>> {
  const { data, error } = await serverClient.http.GET("/v1/patients/{patientId}/vfs", {
    params: { path: { patientId }, query: path ? { path } : undefined },
  });
  return toResult(data, error);
}

/**
 * Reads the rendered content of a VFS file at `path`.
 *
 * `format` controls how the file is rendered: `narrative` (full Markdown, the
 * default), `compact` (condensed Markdown), or `structured` (machine-readable
 * JSON string).
 */
export async function readVfs(
  patientId: string,
  path: string,
  format: VfsFormat = "narrative",
): Promise<Result<ReadResponse>> {
  const { data, error } = await serverClient.http.GET("/v1/patients/{patientId}/read", {
    params: { path: { patientId }, query: { path, format } },
  });
  return toResult(data, error);
}

/** A persisted engine session message, mirroring `IngestSessionBody.messages[number]`. */
export type PersistedMessage = { role: "user" | "assistant"; content: string };

/**
 * Extracts memories from a session's accumulated transcript on the backend, and
 * infers memory↔fact relationships. Append-only: each call re-extracts the whole
 * transcript and appends more memories, so trigger it intentionally (e.g. from a
 * button) rather than on every turn. The transcript is the one the chat route
 * persists server-side via {@link appendMessages}.
 */
export async function generateMemories(
  patientId: string,
  sessionId: string,
): Promise<Result<true>> {
  // The 200 body is just `{ ok: true }` acknowledgment; failure comes back as an
  // HTTP `error`, so collapse the success case to a plain `ok(true)` rather than
  // nesting a redundant `ok` inside the Result.
  const { error } = await serverClient.http.POST(
    "/v1/patients/{patientId}/sessions/{sessionId}/memories",
    { params: { path: { patientId, sessionId } } },
  );
  if (error) return err(errorMessage(error));
  return ok(true);
}
