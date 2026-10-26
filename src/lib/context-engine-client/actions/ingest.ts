"use server";

import { toResult } from "@/lib/context-engine-client/actions/to-result";
import { serverClient } from "@/lib/context-engine-client/server";
import type { Result } from "@/lib/result";
import type {
  IngestFhirBody,
  IngestSessionsMessage,
  Ingestion,
  IngestionList,
  IngestionStatus,
} from "@clinia/context-engine-js";

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

/**
 * Imports the chat's transcript as the session `sessionId` and returns the receipt.
 *
 * Sends the whole transcript every time: turns the session already holds are recognised and
 * not stored again, so only what is new is extracted. A transcript that rewrites a stored
 * turn is refused.
 */
export async function ingestSession(
  patientId: string,
  sessionId: string,
  messages: IngestSessionsMessage[],
): Promise<Result<Ingestion>> {
  const { data, error } = await serverClient.http.POST(
    "/v1/patients/{patientId}/ingestions/sessions",
    { params: { path: { patientId } }, body: { sessions: [{ sessionId, messages }] } },
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
