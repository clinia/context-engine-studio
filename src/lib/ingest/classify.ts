/** Which ingest endpoint a dropped file goes to, if any. */
export type FileKind = "fhir" | "cda" | "unsupported";

/**
 * Classifies a file by extension: `.json` → FHIR, `.xml` → CDA. Anything else is
 * `unsupported` — no ingest endpoint takes it.
 */
export function classifyFile(name: string): FileKind {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "json") return "fhir";
  if (ext === "xml") return "cda";
  return "unsupported";
}
