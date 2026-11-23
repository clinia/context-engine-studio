/** Which ingest endpoint a dropped file goes to, if any. */
export type FileKind = "fhir" | "cda" | "file" | "unsupported";

const FILE_EXTENSIONS = new Set(["pdf", "tif", "tiff", "jpg", "jpeg", "png"]);

/**
 * Classifies a file by extension, ignoring case:
 * - `.json` → `fhir`
 * - `.xml` → `cda`
 * - `.pdf`, `.tif`, `.tiff`, `.jpg`, `.jpeg`, `.png` → `file`, whose text the files endpoint extracts
 * - anything else → `unsupported`, which no ingest endpoint takes
 */
export function classifyFile(name: string): FileKind {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "json") return "fhir";
  if (ext === "xml") return "cda";
  if (FILE_EXTENSIONS.has(ext)) return "file";
  return "unsupported";
}
