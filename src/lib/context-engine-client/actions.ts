"use server";

import { serverClient } from "@/lib/context-engine-client/server";
import { err, errorMessage, ok, type Result } from "@/lib/result";
import type {
  BrowseResult,
  IngestFhirBody,
  Ingestion,
  IngestionList,
  IngestionStatus,
  Patient,
  PatientList,
  ReadResponse,
  Session,
} from "@clinia/context-engine-js";

/** Output format for {@link readVfs}; mirrors the `format` query of the read endpoint. */
export type VfsFormat = "narrative" | "structured" | "compact";

export type PatientListItem = PatientList["data"][number];

/** `perPage` ceiling the patient listing enforces. */
const MAX_PATIENTS_PER_PAGE = 1000;

/** Wraps an openapi-fetch `{ data, error }` response into a {@link Result}. */
function toResult<T>(data: T | undefined, error: unknown): Result<T> {
  if (error) return err(errorMessage(error));
  if (data === undefined) return err("No data returned from the Context Engine API.");
  return ok(data);
}

/**
 * Loads the patients currently registered in the Context Engine API.
 *
 * The patient switcher shows every patient at once, so this asks for the largest
 * page the endpoint allows rather than paging
 */
export async function listPatients(): Promise<PatientListItem[]> {
  const { data } = await serverClient.http.GET("/v1/patients", {
    params: { query: { page: 0, perPage: MAX_PATIENTS_PER_PAGE } },
  });
  return data?.data ?? [];
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
 * What {@link ingestCdaR2} accepts: the markup wrapped in an object rather than
 * passed as a bare string.
 *
 * The wrapper is what makes a large document transmissible. React's Flight
 * decoder — which parses every Server Action argument — gives the argument array
 * a budget of 1e6 "slots" and charges a plain string its full character length,
 * so a document over ~1 MB is rejected with "Maximum array nesting exceeded"
 * long before the 25 MB body limit in `next.config.ts` is anywhere near. A value
 * reached through an object starts a fresh budget.
 */
export type CdaDocument = { xml: string };

/**
 * Submits one FHIR Bundle or resource, parsed as R4. Returns the receipt to poll —
 * the submission is accepted, not processed, by the time this resolves.
 */
export async function ingestFhirR4(
  patientId: string,
  resource: IngestFhirBody,
): Promise<Result<Ingestion>> {
  const { data, error } = await serverClient.http.POST(
    "/v1/patients/{patientId}/ingestions/fhir/r4",
    { params: { path: { patientId } }, body: resource },
  );
  return toResult(data, error);
}

/**
 * Submits one CDA R2 document as `application/cda+xml`. Returns the receipt to
 * poll, like {@link ingestFhirR4}.
 */
export async function ingestCdaR2(
  patientId: string,
  document: CdaDocument,
): Promise<Result<Ingestion>> {
  const { data, error } = await serverClient.http.POST(
    "/v1/patients/{patientId}/ingestions/cda/r2",
    {
      params: { path: { patientId } },
      body: document.xml,
      bodySerializer: (body: unknown) => (typeof body === "string" ? body : JSON.stringify(body)),
      headers: { "Content-Type": "application/cda+xml" },
    },
  );
  return toResult(data, error);
}

/** Sort direction accepted by {@link listIngestions}. */
export type IngestionOrder = "asc" | "desc";

/**
 * The query the ingestions list understands, minus `sort` — `receivedAt` is the
 * only field the endpoint sorts on, so direction is the whole of the choice.
 */
export type IngestionQuery = {
  /** Zero-indexed. */
  page?: number;
  perPage?: number;
  order?: IngestionOrder;
  /** Union, not intersection: a submission in any of these is returned. */
  status?: IngestionStatus[];
};

/** A page of a patient's submissions, newest first unless `order` says otherwise. */
export async function listIngestions(
  patientId: string,
  query: IngestionQuery = {},
): Promise<Result<IngestionList>> {
  const { data, error } = await serverClient.http.GET("/v1/patients/{patientId}/ingestions", {
    params: {
      path: { patientId },
      query: {
        page: query.page ?? 0,
        perPage: query.perPage ?? 50,
        sort: "receivedAt",
        order: query.order ?? "desc",
        // An empty array would be rejected by the endpoint's `minItems: 1`, and
        // means the same thing as no filter at all.
        ...(query.status?.length ? { status: query.status } : {}),
      },
    },
  });
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
