import { describe, expect, it } from "vitest";

import { FactsTable } from "@/components/resolution/facts-table";
import type { ResolvedFact } from "@/lib/context-engine-client/actions";
import { renderHtml } from "@/test/render";

const fact = (id: string, display: string, type: string, members: number): ResolvedFact => ({
  id,
  display,
  type,
  memberIds: Array.from({ length: members }, (_, i) => `${id}-m${i}`),
  fieldVerdicts: {},
  fieldValues: {},
});

const facts = [fact("f1", "albuterol", "medication", 4), fact("f2", "copd", "condition", 1)];

describe("FactsTable", () => {
  const html = renderHtml(<FactsTable facts={facts} selectedId="f1" onSelect={() => {}} />);

  it("heads the columns in a table header", () => {
    expect(html).toMatch(/<thead[^>]*>[\s\S]*>Fact<[\s\S]*>Type<[\s\S]*>Records<[\s\S]*<\/thead>/);
  });

  it("renders one body row per fact, with its name, type and record count", () => {
    const body = html.slice(html.indexOf("<tbody"));
    expect(body.match(/<tr/g)).toHaveLength(2);
    expect(body).toMatch(/title="albuterol"[^>]*>albuterol<[\s\S]*>medication<[\s\S]*>4</);
    expect(body).toMatch(/title="copd"[^>]*>copd<[\s\S]*>condition<[\s\S]*>1</);
  });

  it("makes each row reachable with the keyboard", () => {
    const body = html.slice(html.indexOf("<tbody"));
    expect(body.match(/<tr[^>]*tabindex="0"/g)).toHaveLength(2);
  });
});
