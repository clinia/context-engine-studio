import type { FieldVerdict, LayerEvidence } from "@/lib/context-engine-client/graph-payloads";
import type { MergeLink, MergeReasoning } from "@/lib/resolution/merge-reasoning";

export type FieldSimilarity = Extract<LayerEvidence, { kind: "field-similarity" }>;
type LlmMerged = Extract<LayerEvidence, { canonical: "merged" }>;

export type FieldRow = {
  field: string;
  /** One cell per wording column; `null` where that link did not compare the field. */
  wording: (FieldSimilarity | null)[];
  /** What the model settled the field to, per link it ran on. */
  settled: { recordId: string; resolution?: unknown; strategy: string }[];
  verdict: FieldVerdict | undefined;
};

/** The links whose evidence compared fields one by one, and every field they or the fact name. */
export function fieldMatrix(
  reasoning: MergeReasoning,
  verdicts: Record<string, FieldVerdict>,
): { columns: MergeLink[]; rows: FieldRow[] } {
  const columns = reasoning.links.filter((link) =>
    link.decision.decision.evidence.some((item) => item.kind === "field-similarity"),
  );
  const fields: string[] = [];
  const add = (field: string) => {
    if (!fields.includes(field)) fields.push(field);
  };

  for (const link of columns) {
    for (const item of link.decision.decision.evidence) {
      if (item.kind === "field-similarity") add(item.field);
    }
  }
  const settled = reasoning.links.flatMap((link) =>
    link.decision.decision.evidence
      .filter(
        (item): item is LlmMerged =>
          item.kind === "llm" && item.match && item.canonical === "merged",
      )
      .flatMap((item) =>
        item.conflicts.map((conflict) => ({ recordId: link.recordId, ...conflict })),
      ),
  );
  for (const { field } of settled) add(field);
  for (const field of Object.keys(verdicts)) add(field);

  return {
    columns,
    rows: fields.map((field) => ({
      field,
      wording: columns.map(
        (link) =>
          link.decision.decision.evidence.find(
            (item): item is FieldSimilarity =>
              item.kind === "field-similarity" && item.field === field,
          ) ?? null,
      ),
      settled: settled.filter((item) => item.field === field),
      verdict: verdicts[field],
    })),
  };
}
