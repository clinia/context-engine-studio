import { describe, expect, it } from "vitest";

import { classifyFile, type FileKind } from "@/lib/ingest/classify";

describe("classifyFile", () => {
  it.each<[string, FileKind]>([
    ["bundle.json", "fhir"],
    ["note.xml", "cda"],
    ["labs.pdf", "file"],
    ["LABS.PDF", "file"],
    ["scan.tif", "file"],
    ["scan.tiff", "file"],
    ["photo.jpg", "file"],
    ["photo.jpeg", "file"],
    ["chart.png", "file"],
    ["letter.docx", "unsupported"],
    ["README", "unsupported"],
  ])("classifies %s as %s", (name, kind) => {
    expect(classifyFile(name)).toBe(kind);
  });
});
