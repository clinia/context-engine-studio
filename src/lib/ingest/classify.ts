/** How a dropped file is routed into the batch ingest payload. */
export type FileKind = "fhir" | "cda" | "document";

/**
 * Classifies a file by extension: `.json` → FHIR, `.xml` → CDA, anything else
 * is registered as an unstructured document.
 */
export function classifyFile(name: string): FileKind {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "json") return "fhir";
  if (ext === "xml") return "cda";
  return "document";
}
