"use server";

import { defineAction } from "@/core/request-scope";
import { toResult } from "@/lib/context-engine-client/actions/to-result";
import { errorMessage, ok, type Result } from "@/lib/result";
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
export const ingestFhirR4 = defineAction(
  async (driver, patientId: string, resource: IngestFhirBody): Promise<Result<Ingestion>> => {
    const client = driver.getContextEngineClient();
    const { data, error } = await client.http.POST("/v1/patients/{patientId}/ingestions/fhir/r4", {
      params: { path: { patientId } },
      body: resource,
    });
    return toResult(data, error);
  },
);

/**
 * Submits one CDA R2 document as `application/cda+xml`. Returns the receipt to
 * poll, like {@link ingestFhirR4}.
 */
export const ingestCdaR2 = defineAction(
  async (driver, patientId: string, document: CdaDocument): Promise<Result<Ingestion>> => {
    const client = driver.getContextEngineClient();
    const { data, error } = await client.http.POST("/v1/patients/{patientId}/ingestions/cda/r2", {
      params: { path: { patientId } },
      body: document.xml,
      bodySerializer: (body: unknown) => (typeof body === "string" ? body : JSON.stringify(body)),
      headers: { "Content-Type": "application/cda+xml" },
    });
    return toResult(data, error);
  },
);

/** What became of a file sent to {@link ingestFile}. */
export type IngestFileOutcome =
  | { status: "accepted"; ingestion: Ingestion }
  | { status: "failed"; extraction: boolean; message: string }
  | { status: "disabled"; message: string };

/**
 * Submits one PDF or image to the files endpoint and returns the receipt.
 *
 * - Resolves only once text extraction has finished, which can take up to the server's
 *   extraction deadline.
 * - Answers `accepted` whenever the server kept a receipt, even one that used nothing from
 *   the file, such as a scan no page of which yielded text. The receipt's `intake` says why.
 * - Answers `failed`, with the server's message, when the server refused the request.
 *   `extraction` is true on a `502` or `504`: text extraction failed or ran past its deadline.
 * - Answers `disabled`, with the server's message, on a `403` without an `insufficient_scope`
 *   challenge: file ingestion is not enabled for the workspace. A missing `write` scope is
 *   `failed`.
 * - Rejects when the request never reached the server, such as on a network error.
 */
export const ingestFile = defineAction(
  async (driver, patientId: string, file: File): Promise<Result<IngestFileOutcome>> => {
    const client = driver.getContextEngineClient();
    const { data, error, response } = await client.ingest.ingestFiles(patientId, {
      files: [file],
    });
    const challenge = response.headers.get("WWW-Authenticate") ?? "";
    if (response.status === 403 && !challenge.includes("insufficient_scope")) {
      return ok({ status: "disabled", message: errorMessage(error) });
    }
    const result = toResult(data, error);
    if (!result.ok) {
      const extraction = response.status === 502 || response.status === 504;
      return ok({ status: "failed", extraction, message: result.error });
    }
    return ok({ status: "accepted", ingestion: result.data });
  },
);

/**
 * Imports the chat's transcript as the session `sessionId` and returns the receipt.
 *
 * Sends the whole transcript every time: turns the session already holds are recognised and
 * not stored again, so only what is new is extracted. A transcript that rewrites a stored
 * turn is refused.
 */
export const ingestSession = defineAction(
  async (
    driver,
    patientId: string,
    sessionId: string,
    messages: IngestSessionsMessage[],
  ): Promise<Result<Ingestion>> => {
    const client = driver.getContextEngineClient();
    const { data, error } = await client.http.POST("/v1/patients/{patientId}/ingestions/sessions", {
      params: { path: { patientId } },
      body: { sessions: [{ sessionId, messages }] },
    });
    return toResult(data, error);
  },
);

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
export const listIngestions = defineAction(
  async (driver, patientId: string, query: IngestionQuery = {}): Promise<Result<IngestionList>> => {
    const client = driver.getContextEngineClient();
    const { data, error } = await client.http.GET("/v1/patients/{patientId}/ingestions", {
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
  },
);
