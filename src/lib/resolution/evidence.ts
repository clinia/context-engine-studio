import type { FactDecision } from "@/lib/context-engine-client/actions";
import type { LayerEvidence } from "@/lib/context-engine-client/graph-payloads";

/** The evidence kinds each stop rule settles on. */
const DECIDING_KINDS: Partial<Record<string, readonly LayerEvidence["kind"][]>> = {
  "source-ref-equality": ["source-ref"],
  "medication-identity-match": ["medication-identity-match"],
  "medication-identity-mismatch": ["medication-identity-mismatch"],
  "medication-identity-incomplete": ["medication-identity-incomplete"],
  "deterministic-code-exact": ["exact-code-match"],
  "deterministic-code-hierarchical": ["hierarchical-code-match"],
  "concept-identity-match": ["concept-identity-match"],
  "deterministic-code-mismatch": ["code-mismatch"],
  "nlp-normalization-match": ["field-similarity"],
  "embedding-similarity": ["semantic-similarity"],
  "llm-adjudication": ["llm"],
};

/**
 * Splits a decision's evidence into what its stop rule decided on and what other layers
 * recorded along the way. A rule with no known kinds, or none of them present, decided on
 * all of it.
 */
export function splitEvidence(
  ruleId: string,
  evidence: LayerEvidence[],
): { deciding: LayerEvidence[]; other: LayerEvidence[] } {
  const kinds = DECIDING_KINDS[ruleId] ?? [];
  const deciding = evidence.filter((item) => kinds.includes(item.kind));
  if (deciding.length === 0) return { deciding: evidence, other: [] };
  return { deciding, other: evidence.filter((item) => !kinds.includes(item.kind)) };
}

/** Decisions whose deciding evidence reads the same. */
export type SharedEvidence = { deciding: LayerEvidence[]; samples: FactDecision[] };

/** Groups decisions whose deciding evidence reads the same, in first-seen order. */
export function bySharedEvidence(samples: FactDecision[]): SharedEvidence[] {
  const groups = new Map<string, SharedEvidence>();
  for (const sample of samples) {
    const { deciding } = splitEvidence(sample.decision.ruleId, sample.decision.evidence);
    const key = JSON.stringify(deciding);
    const existing = groups.get(key);
    if (existing) existing.samples.push(sample);
    else groups.set(key, { deciding, samples: [sample] });
  }
  return [...groups.values()];
}
