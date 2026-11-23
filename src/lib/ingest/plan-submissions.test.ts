import { describe, expect, it, vi } from "vitest";

import { detectFiles, planSubmissions } from "@/lib/ingest/plan-submissions";

const MAX_BYTES = 1024;

const fhir = (name: string) =>
  new File([JSON.stringify({ resourceType: "Patient", id: "p1" })], name, {
    type: "application/json",
  });
const cda = (name: string) => new File(["<ClinicalDocument/>"], name, { type: "text/xml" });
const binary = (name: string, bytes: number, type: string) =>
  new File([new Uint8Array(bytes)], name, { type });

describe("planSubmissions", () => {
  it("sends each PDF and image in its own request, last, without reading it", async () => {
    const pdf = binary("labs.pdf", 100, "application/pdf");
    const png = binary("scan.png", 100, "image/png");
    const reads = [vi.spyOn(pdf, "text"), vi.spyOn(png, "text")];

    const planned = await planSubmissions(detectFiles([pdf, png, fhir("a.json")]), MAX_BYTES);

    expect(planned.ok && planned.data.submissions.map((submission) => submission.kind)).toEqual([
      "fhir",
      "file",
      "file",
    ]);
    expect(planned.ok && planned.data.submissions.slice(1)).toEqual([
      { kind: "file", name: "labs.pdf", file: pdf },
      { kind: "file", name: "scan.png", file: png },
    ]);
    for (const read of reads) expect(read).not.toHaveBeenCalled();
  });

  it("bounds each PDF or image by itself", async () => {
    const fits = [binary("a.pdf", 600, "application/pdf"), binary("b.jpg", 600, "image/jpeg")];

    const planned = await planSubmissions(detectFiles(fits), MAX_BYTES);

    expect(planned.ok && planned.data.submissions).toHaveLength(2);
  });

  it("leaves out an image larger than one request and plans the rest", async () => {
    const tiff = binary("scan.tiff", MAX_BYTES + 1, "image/tiff");

    const planned = await planSubmissions(detectFiles([tiff, fhir("a.json")]), MAX_BYTES);

    expect(planned.ok && planned.data.submissions.map((submission) => submission.name)).toEqual([
      "a.json",
    ]);
    expect(planned.ok && planned.data.oversized).toEqual([tiff]);
  });

  it("tells apart two files of the same name", async () => {
    const small = binary("report.pdf", 100, "application/pdf");
    const large = binary("report.pdf", MAX_BYTES + 1, "application/pdf");

    const planned = await planSubmissions(detectFiles([small, large]), MAX_BYTES);

    expect(planned.ok && planned.data.submissions.map((submission) => submission.file)).toEqual([
      small,
    ]);
    expect(planned.ok && planned.data.oversized[0]).toBe(large);
  });

  it("carries each slice of a split Bundle with the file it came from", async () => {
    const entry = { resource: { resourceType: "Observation", value: "x".repeat(400) } };
    const bundle = new File(
      [JSON.stringify({ resourceType: "Bundle", entry: [entry, entry, entry] })],
      "bundle.json",
      { type: "application/json" },
    );

    const planned = await planSubmissions(detectFiles([bundle]), MAX_BYTES);

    expect(planned.ok && planned.data.submissions.length).toBeGreaterThan(1);
    expect(planned.ok && planned.data.submissions.every(({ file }) => file === bundle)).toBe(true);
  });

  it("refuses a CDA document larger than one request", async () => {
    const large = new File(
      [`<ClinicalDocument>${"x".repeat(MAX_BYTES)}</ClinicalDocument>`],
      "big.xml",
      {
        type: "text/xml",
      },
    );

    const planned = await planSubmissions(detectFiles([large]), MAX_BYTES);

    expect(planned).toEqual({
      ok: false,
      error: { reason: "tooLarge", name: "big.xml", file: large },
    });
  });

  it("plans a mixed folder and skips what no endpoint takes", async () => {
    const files = [
      binary("labs.pdf", 100, "application/pdf"),
      fhir("bundle.json"),
      cda("note.xml"),
      binary("letter.docx", 100, "application/octet-stream"),
    ];

    const planned = await planSubmissions(detectFiles(files), MAX_BYTES);

    expect(planned.ok && planned.data.submissions.map((submission) => submission.kind)).toEqual([
      "fhir",
      "cda",
      "file",
    ]);
  });
});
