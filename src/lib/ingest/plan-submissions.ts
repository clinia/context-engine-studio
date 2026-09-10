import type { IngestFhirBody } from "@clinia/context-engine-js";

import type { CdaDocument } from "@/lib/context-engine-client/actions";
import { classifyFile, type FileKind } from "@/lib/ingest/classify";
import { err, ok, type Result } from "@/lib/result";

/** A file paired with its detected ingest kind, for display and submission. */
export interface DetectedFile {
  file: File;
  kind: FileKind;
}

/** One file read into the payload its endpoint takes. */
export type PlannedSubmission =
  | { kind: "fhir"; name: string; resource: IngestFhirBody }
  | { kind: "cda"; name: string; document: CdaDocument };

/**
 * Why a file could not be turned into a submission. Structured rather than a
 * message string so the UI renders a translated message naming the file.
 */
export interface PlanSubmissionsError {
  reason: "unreadable" | "invalidJson" | "notFhir" | "tooLarge";
  name: string;
}

export function detectFiles(files: File[]): DetectedFile[] {
  return files.map((file) => ({ file, kind: classifyFile(file.name) }));
}

const encoder = new TextEncoder();

const byteLength = (value: string) => encoder.encode(value).length;

function isFhirBody(value: unknown): value is IngestFhirBody {
  return (
    typeof value === "object" &&
    value !== null &&
    "resourceType" in value &&
    typeof (value as { resourceType: unknown }).resourceType === "string"
  );
}

/**
 * Splits a Bundle too large for one request into several carrying slices of its
 * entries, or answers null when there is no split to make — a single resource, or one
 * entry that exceeds `maxBytes` by itself.
 *
 * Each slice becomes its own submission and its own receipt, which costs nothing: a
 * Bundle's entries are independent of each other, and readiness is polled per patient
 * rather than per receipt.
 */
function splitBundle(bundle: IngestFhirBody, maxBytes: number): IngestFhirBody[] | null {
  const entries = bundle.entry;
  if (!Array.isArray(entries) || entries.length < 2) return null;

  // `total` and `link` describe the search this Bundle answered, not a slice of it.
  const { entry: _entry, total: _total, link: _link, ...envelope } = bundle;
  const overhead = byteLength(JSON.stringify({ ...envelope, entry: [] }));

  const measured = entries.map((item) => ({ item, bytes: byteLength(JSON.stringify(item)) + 1 }));
  if (measured.some(({ bytes }) => overhead + bytes > maxBytes)) return null;

  const slices: unknown[][] = [];
  let current: unknown[] = [];
  let size = overhead;

  for (const { item, bytes } of measured) {
    if (current.length > 0 && size + bytes > maxBytes) {
      slices.push(current);
      current = [];
      size = overhead;
    }
    current.push(item);
    size += bytes;
  }
  if (current.length > 0) slices.push(current);

  return slices.map((entry) => ({ ...envelope, entry }));
}

async function readSubmissions(
  detected: DetectedFile,
  maxBytes: number,
): Promise<Result<PlannedSubmission[], PlanSubmissionsError>> {
  const { file, kind } = detected;
  const name = file.name;

  let text: string;
  try {
    text = await file.text();
  } catch {
    return err({ reason: "unreadable", name });
  }

  if (kind === "cda") {
    // A document is atomic — there is no smaller unit to send it in.
    if (byteLength(text) > maxBytes) return err({ reason: "tooLarge", name });
    return ok([{ kind, name, document: { xml: text } }]);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return err({ reason: "invalidJson", name });
  }
  if (!isFhirBody(parsed)) return err({ reason: "notFhir", name });

  // Measured on the serialized resource rather than the file, which is what the request
  // actually carries — a pretty-printed bundle is routinely half its on-disk size.
  if (byteLength(JSON.stringify(parsed)) <= maxBytes) {
    return ok([{ kind: "fhir", name, resource: parsed }]);
  }

  const slices = splitBundle(parsed, maxBytes);
  if (slices === null) return err({ reason: "tooLarge", name });

  return ok(slices.map((resource) => ({ kind: "fhir", name, resource })));
}

/**
 * Reads detected files into the submissions that carry them — a CDA file is one call to
 * the R2 endpoint, a FHIR file one call to the R4 endpoint, or several when its Bundle
 * has to be sliced to fit.
 *
 * `maxBytes` bounds one request rather than a batch: each call carries one payload, so
 * it is the Server Action body-size limit that a payload has to fit under. Fails
 * (without throwing) on the first file that cannot be submitted at all.
 *
 * Files classified `unsupported` are skipped: no endpoint takes them, and a folder of
 * clinical data routinely carries a few.
 */
export async function planSubmissions(
  detected: DetectedFile[],
  maxBytes: number,
): Promise<Result<PlannedSubmission[], PlanSubmissionsError>> {
  const submissions: PlannedSubmission[] = [];

  for (const detectedFile of detected) {
    if (detectedFile.kind === "unsupported") continue;
    const planned = await readSubmissions(detectedFile, maxBytes);
    if (!planned.ok) return planned;
    submissions.push(...planned.data);
  }

  return ok(submissions);
}
