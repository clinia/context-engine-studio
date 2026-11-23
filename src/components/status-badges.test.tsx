import { describe, expect, it } from "vitest";

import { IngestionStatusBadge } from "@/components/ingestions/ingestion-status-badge";
import { ResolutionLevelBadge } from "@/components/resolution/resolution-badges";
import { renderHtml } from "@/test/render";

describe("IngestionStatusBadge", () => {
  it.each([
    ["pending", "Pending"],
    ["processing", "Processing"],
    ["succeeded", "Succeeded"],
    ["partial", "Partial"],
    ["failed", "Failed"],
  ] as const)("names the %s status in words, with a decorative dot", (status, label) => {
    const html = renderHtml(<IngestionStatusBadge status={status} />);

    expect(html).toContain(`>${label}<`);
    expect(html).toMatch(/<span[^>]*aria-hidden="true"[^>]*><\/span>/);
  });
});

describe("ResolutionLevelBadge", () => {
  it("names the level, and keeps its hint as the title", () => {
    const html = renderHtml(<ResolutionLevelBadge resolution="confirmed" />);

    expect(html).toContain(">Confirmed<");
    expect(html).toMatch(/title="[^"]+"/);
  });

  it("puts the count in the label", () => {
    expect(renderHtml(<ResolutionLevelBadge resolution="probable" count={5} />)).toContain(
      ">5 probable<",
    );
  });
});
