import type { FactDecision } from "@/lib/context-engine-client/actions";
import type { ResolutionLevel } from "@/lib/context-engine-client/graph-payloads";
import { countLevels, levelRank } from "@/lib/resolution/levels";

/** Whole decisions kept per rule group. */
const SAMPLES_PER_GROUP = 3;

/** Every decision one stop rule reached about a fact, reduced to what fits on screen. */
export type DecisionGroup = {
  ruleId: string;
  count: number;
  /** How many of the group's decisions carried each level. Zero entries are kept out. */
  resolutions: Partial<Record<ResolutionLevel, number>>;
  /** A few whole decisions, weakest first. */
  samples: FactDecision[];
};

/** Decisions grouped by stop rule, most frequent rule first. */
export function groupByRule(decisions: readonly FactDecision[]): DecisionGroup[] {
  const byRule = new Map<string, FactDecision[]>();
  for (const decision of decisions) {
    const existing = byRule.get(decision.decision.ruleId);
    if (existing) existing.push(decision);
    else byRule.set(decision.decision.ruleId, [decision]);
  }

  return [...byRule.entries()]
    .map(([ruleId, ruleDecisions]) => ({
      ruleId,
      count: ruleDecisions.length,
      resolutions: countLevels(ruleDecisions, ({ decision }) => decision.resolution),
      samples: [...ruleDecisions]
        .sort((a, b) => levelRank(b.decision.resolution) - levelRank(a.decision.resolution))
        .slice(0, SAMPLES_PER_GROUP),
    }))
    .sort((a, b) => b.count - a.count);
}
