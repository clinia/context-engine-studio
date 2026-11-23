import { describe, expect, it } from "vitest";

import { IngestionDetailPanel } from "@/components/ingestions/ingestion-detail-panel";
import { renderHtml } from "@/test/render";
import type { Ingestion } from "@clinia/context-engine-js";

const ingestion: Ingestion = {
  ingestionId: "ing_01",
  source: "file/v1",
  mimeType: "multipart/form-data",
  status: "partial",
  receivedAt: "2026-11-16T10:00:00.000Z",
  startedAt: null,
  completedAt: null,
  failure: null,
  staged: { facts: 0, events: 0, narratives: 1, messages: 0 },
  intake: [
    {
      unit: "page",
      received: 7,
      filename: "labs.pdf",
      entries: [
        { kind: "page", outcome: "text_only", count: 2 },
        {
          kind: "page",
          pageNumbers: [1, 2, 3, 5],
          outcome: "ignored",
          reason: "unusable",
          count: 4,
        },
        { kind: "page", pageNumbers: [6], outcome: "ignored", reason: "empty", count: 1 },
      ],
    },
    {
      unit: "file",
      received: 1,
      filename: "scan.tif",
      entries: [
        {
          kind: "image/tiff",
          outcome: "ignored",
          reason: "over_limit",
          limit: { name: "pages_per_file", value: 40 },
          count: 1,
        },
      ],
    },
    {
      unit: "file",
      received: 1,
      filename: "big.pdf",
      entries: [
        {
          kind: "application/pdf",
          outcome: "ignored",
          reason: "over_limit",
          limit: { name: "file_bytes", value: 64_000_000 },
          count: 1,
        },
      ],
    },
    {
      unit: "section",
      received: 1,
      entries: [{ kind: "30954-2", label: "Results", outcome: "structured", count: 1 }],
    },
  ],
};

describe("IngestionDetailPanel", () => {
  const html = renderHtml(
    <IngestionDetailPanel ingestion={ingestion} onClose={() => {}} now={0} />,
  );

  it("names a file's ignored page entries by their pages", () => {
    expect(html).toContain(">page · 1–3, 5<");
    expect(html).toContain(">page · 6<");
  });

  it("names a page entry that lists no pages by its kind", () => {
    expect(html).toContain(">page<");
  });

  it("names an entry over a limit by the limit", () => {
    expect(html).toContain(">image/tiff · max 40 pages<");
    expect(html).toContain(">application/pdf · max 64 MB<");
  });

  it("names other entries by kind and label", () => {
    expect(html).toContain(">30954-2 · Results<");
  });
});
