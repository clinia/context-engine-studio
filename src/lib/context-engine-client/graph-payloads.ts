import type {
  ExtractedFactNode,
  FactConflicts,
  MedicationIdentity,
  ResolutionDecisionEdge,
} from "@clinia/context-engine-js";

/** Names for the pieces of graph node and edge payloads the resolution views read. */

export type DecisionEdgePayload = ResolutionDecisionEdge["payload"];

/** One layer's evidence on a decision, discriminated on `kind`. */
export type LayerEvidence = DecisionEdgePayload["evidence"][number];

export type { MedicationIdentity };

export type Verdict = DecisionEdgePayload["verdict"];
export type ResolutionLevel = DecisionEdgePayload["resolution"];

/**
 * How a fact's members voted on one field. `picked` is the member whose value the fact
 * kept; `conflict` carries each dissenting member's value.
 */
export type FieldVerdict = FactConflicts[string];

export type ExtractedFactPayload = ExtractedFactNode["payload"];

/** A clinical code as a record carries it. `display` is the source's own wording. */
export type Coding = NonNullable<ExtractedFactPayload["codes"]>[number];

/** Where one extracted record came from. */
export type SourceReference = ExtractedFactPayload["source"];
