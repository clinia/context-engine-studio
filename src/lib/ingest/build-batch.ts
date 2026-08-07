import type { IngestBatchBody } from "@clinia/context-engine-js";

import type { IngestBatchPayload } from "@/lib/context-engine-client/actions";
import { classifyFile, type FileKind } from "@/lib/ingest/classify";
import { err, ok, type Result } from "@/lib/result";

/** A file paired with its detected ingest kind, for display and submission. */
export interface DetectedFile {
  file: File;
  kind: FileKind;
}

/**
 * Why a batch could not be assembled. Structured (rather than a message string)
 * so the UI can render a translated message naming the offending file.
 */
export interface BuildBatchError {
  invalidFile: string;
}

type DocumentBody = NonNullable<IngestBatchBody["documents"]>[number];

export function detectFiles(files: File[]): DetectedFile[] {
  return files.map((file) => ({ file, kind: classifyFile(file.name) }));
}

const encoder = new TextEncoder();

/** A file read into its submittable payload, tagged with its serialized byte size. */
type ReadItem =
  | { kind: "fhir"; resource: Record<string, unknown>; bytes: number }
  | { kind: "cda"; xml: string; bytes: number }
  | { kind: "document"; document: DocumentBody; bytes: number };

async function readItem(detected: DetectedFile): Promise<ReadItem | BuildBatchError> {
  const { file, kind } = detected;

  if (kind === "fhir") {
    try {
      const text = await file.text();
      return {
        kind,
        resource: JSON.parse(text) as Record<string, unknown>,
        bytes: byteLength(text),
      };
    } catch {
      return { invalidFile: file.name };
    }
  }

  if (kind === "cda") {
    try {
      const xml = await file.text();
      return { kind, xml, bytes: byteLength(xml) };
    } catch {
      return { invalidFile: file.name };
    }
  }

  const document: DocumentBody = { name: file.name, mimeType: file.type || undefined };
  return { kind, document, bytes: byteLength(JSON.stringify(document)) };
}

function byteLength(value: string): number {
  return encoder.encode(value).length;
}

/** Greedily packs items into chunks whose combined byte size stays under `maxBytes`. */
function chunkBySize<T extends { bytes: number }>(items: T[], maxBytes: number): T[][] {
  const chunks: T[][] = [];
  let current: T[] = [];
  let size = 0;

  for (const item of items) {
    if (current.length > 0 && size + item.bytes > maxBytes) {
      chunks.push(current);
      current = [];
      size = 0;
    }
    current.push(item);
    size += item.bytes;
  }
  if (current.length > 0) chunks.push(current);

  return chunks;
}

/**
 * Reads detected files and splits them into one or more batch payloads, each
 * kept under `maxBytes` so a single Server Action request never exceeds the
 * configured body-size limit. Batches are grouped by kind (FHIR / CDA /
 * documents) and then split by size.
 *
 * Fails (without throwing) if a `.json` file cannot be read or is not valid JSON.
 */
export async function planIngestBatches(
  detected: DetectedFile[],
  maxBytes: number,
): Promise<Result<IngestBatchPayload[], BuildBatchError>> {
  // Pass 1 — read and measure every file, keeping them bucketed by kind.
  const fhir: Extract<ReadItem, { kind: "fhir" }>[] = [];
  const cda: Extract<ReadItem, { kind: "cda" }>[] = [];
  const documents: Extract<ReadItem, { kind: "document" }>[] = [];

  for (const detectedFile of detected) {
    const item = await readItem(detectedFile);
    if ("invalidFile" in item) return err(item);
    if (item.kind === "fhir") fhir.push(item);
    else if (item.kind === "cda") cda.push(item);
    else documents.push(item);
  }

  // Pass 2 — split each kind into size-bounded batches.
  const batches: IngestBatchPayload[] = [];
  for (const chunk of chunkBySize(fhir, maxBytes)) {
    batches.push({ fhir: chunk.map((i) => i.resource) });
  }
  for (const chunk of chunkBySize(cda, maxBytes)) {
    batches.push({ cda: chunk.map((i) => ({ xml: i.xml })) });
  }
  for (const chunk of chunkBySize(documents, maxBytes)) {
    batches.push({ documents: chunk.map((i) => i.document) });
  }

  return ok(batches);
}
