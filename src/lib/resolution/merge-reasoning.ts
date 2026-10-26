import type { FactDecision } from "@/lib/context-engine-client/actions";
import type { LayerEvidence, ResolutionLevel } from "@/lib/context-engine-client/graph-payloads";
import { countLevels, levelRank } from "@/lib/resolution/levels";

/** The cascade's checks in the order they run, exact first, judged last. */
export const STEPS = ["source", "identity", "code", "wording", "meaning", "model"] as const;
export type Step = (typeof STEPS)[number];

/** Steps whose merges compare identifiers or identities. */
const EXACT_STEPS: ReadonlySet<Step> = new Set(["source", "identity", "code"]);

const LAYER_STEP: Record<LayerEvidence["layer"], Step> = {
  "source-ref-equality": "source",
  identity: "identity",
  "deterministic-code": "code",
  "nlp-normalization": "wording",
  "embedding-similarity": "meaning",
  "llm-adjudication": "model",
};

const RULE_STEP: Partial<Record<string, Step>> = {
  "source-ref-equality": "source",
  "medication-identity-match": "identity",
  "deterministic-code-exact": "code",
  "deterministic-code-hierarchical": "code",
  "concept-identity-match": "code",
  "nlp-normalization-match": "wording",
  "embedding-similarity": "meaning",
  "llm-adjudication": "model",
};

/** The check a decision stopped on; `null` for a rule outside the cascade's ladder. */
export function stepOf(decision: FactDecision): Step | null {
  return RULE_STEP[decision.decision.ruleId] ?? null;
}

export function isExactStep(step: Step | null): boolean {
  return step !== null && EXACT_STEPS.has(step);
}

/**
 * The deciding check's own score, 0–1: model confidence, cosine similarity, or the mean
 * field similarity for wording. `null` for exact checks, which have no score.
 */
export function scoreOf(decision: FactDecision): number | null {
  const evidence = decision.decision.evidence;
  switch (stepOf(decision)) {
    case "model": {
      const llm = evidence.find((item) => item.kind === "llm");
      return llm ? llm.confidence : null;
    }
    case "meaning": {
      const semantic = evidence.find((item) => item.kind === "semantic-similarity");
      return semantic ? semantic.measurement.similarity : null;
    }
    case "wording": {
      const fields = evidence.filter((item) => item.kind === "field-similarity");
      if (fields.length === 0) return null;
      return fields.reduce((sum, item) => sum + item.similarity, 0) / fields.length;
    }
    default:
      return null;
  }
}

/** Negative when `a` is the stronger decision: earlier check, then higher level, then higher score. */
function compareStrength(a: FactDecision, b: FactDecision): number {
  const stepRank = (decision: FactDecision) => {
    const step = stepOf(decision);
    return step === null ? STEPS.length : STEPS.indexOf(step);
  };
  return (
    stepRank(a) - stepRank(b) ||
    levelRank(a.decision.resolution) - levelRank(b.decision.resolution) ||
    (scoreOf(b) ?? 1) - (scoreOf(a) ?? 1)
  );
}

/** The decision that brought one record into the fact, attaching it to a record already there. */
export type MergeLink = {
  recordId: string;
  joinedId: string;
  step: Step | null;
  decision: FactDecision;
};

export type MergeReasoning = {
  /** Members in reading order: the first member, then each linked record by step. Unlinked records come last. */
  order: string[];
  /** One per linked record, in `order`. */
  links: MergeLink[];
  /** Members no recorded merge connects to the first member's group. */
  unlinkedIds: string[];
  /** Links per step. */
  byStep: Record<Step, number>;
  /** Links per level. Zero entries are kept out. */
  levels: Partial<Record<ResolutionLevel, number>>;
  /** The weakest link, when a judged step decided it. */
  weakest: MergeLink | null;
  /**
   * A code every code link matched on, the first one found when several are. `null` when no
   * code is common to all of them, no link matched on a code, or one matched on a broader code.
   */
  sharedCode: { system: string; code: string } | null;
};

class UnionFind {
  private readonly parent = new Map<string, string>();

  find(id: string): string {
    const parent = this.parent.get(id) ?? id;
    if (parent === id) return id;
    const root = this.find(parent);
    this.parent.set(id, root);
    return root;
  }

  union(a: string, b: string): boolean {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA === rootB) return false;
    this.parent.set(rootB, rootA);
    return true;
  }
}

function sharedCode(links: MergeLink[]): { system: string; code: string } | null {
  const codeSets = links
    .filter((link) => link.step === "code")
    .map((link) =>
      link.decision.decision.evidence.flatMap((item) =>
        item.kind === "exact-code-match" ? [{ system: item.system, code: item.code }] : [],
      ),
    );
  const [first = [], ...rest] = codeSets;
  return (
    first.find((candidate) =>
      rest.every((codes) =>
        codes.some(({ system, code }) => system === candidate.system && code === candidate.code),
      ),
    ) ?? null
  );
}

/**
 * Reduces a fact's merge decisions to one link per record: the strongest decision that ties
 * it to the rest. A maximum spanning tree over the members, rooted at the first one.
 *
 * - A record reached only through decisions outside `merges` is listed in `unlinkedIds`; its
 *   own group still gets links.
 * - Decisions with an end outside `memberIds` are ignored.
 */
export function deriveMergeReasoning(
  memberIds: readonly string[],
  merges: readonly FactDecision[],
): MergeReasoning {
  const members = new Set(memberIds);
  const sorted = merges
    .filter(({ fromId, toId }) => members.has(fromId) && members.has(toId))
    .sort(compareStrength);

  const forest = new UnionFind();
  const adjacency = new Map<string, FactDecision[]>();
  for (const decision of sorted) {
    if (!forest.union(decision.fromId, decision.toId)) continue;
    for (const id of [decision.fromId, decision.toId]) {
      const edges = adjacency.get(id);
      if (edges) edges.push(decision);
      else adjacency.set(id, [decision]);
    }
  }

  const visited = new Set<string>();
  const linksByRoot: MergeLink[][] = [];
  const roots: string[] = [];
  for (const root of memberIds) {
    if (visited.has(root)) continue;
    visited.add(root);
    roots.push(root);
    const links: MergeLink[] = [];
    const queue = [root];
    for (let current = queue.shift(); current !== undefined; current = queue.shift()) {
      for (const decision of adjacency.get(current) ?? []) {
        const next = decision.fromId === current ? decision.toId : decision.fromId;
        if (visited.has(next)) continue;
        visited.add(next);
        queue.push(next);
        links.push({ recordId: next, joinedId: current, step: stepOf(decision), decision });
      }
    }
    linksByRoot.push(links);
  }

  const stepIndex = (link: MergeLink) =>
    link.step === null ? STEPS.length : STEPS.indexOf(link.step);
  const links = linksByRoot.flat().sort((a, b) => stepIndex(a) - stepIndex(b));
  const [firstRoot, ...unlinkedIds] = roots;

  const byStep = Object.fromEntries(STEPS.map((step) => [step, 0])) as Record<Step, number>;
  for (const link of links) if (link.step) byStep[link.step] += 1;
  const levels = countLevels(links, (link) => link.decision.decision.resolution);

  const weakest = links.reduce<MergeLink | null>(
    (current, link) =>
      current === null || compareStrength(link.decision, current.decision) > 0 ? link : current,
    null,
  );

  return {
    order: [
      ...(firstRoot === undefined ? [] : [firstRoot]),
      ...links.map((link) => link.recordId),
      ...unlinkedIds,
    ],
    links,
    unlinkedIds,
    byStep,
    levels,
    weakest: weakest && !isExactStep(weakest.step) ? weakest : null,
    sharedCode: sharedCode(links),
  };
}

/**
 * What one check did on one decision:
 * - `passed`: it ran and left the pair to the next check.
 * - `decided`: the decision stopped here.
 * - `skipped`: it came before the deciding check but recorded nothing.
 */
export type TrailStatus = "passed" | "decided" | "skipped";

export type TrailStep = { step: Step; status: TrailStatus; evidence: LayerEvidence[] };

/**
 * The checks a decision went through, in order, up to the one it stopped on.
 *
 * - Identity shows only when it decided or recorded evidence, since it runs in place of the code checks.
 * - A decision on a rule outside the ladder shows only the checks that recorded evidence.
 */
export function trailOf(decision: FactDecision): TrailStep[] {
  const deciding = stepOf(decision);
  const end = deciding === null ? STEPS.length : STEPS.indexOf(deciding) + 1;

  return STEPS.slice(0, end).flatMap<TrailStep>((step) => {
    const evidence = decision.decision.evidence.filter((item) => LAYER_STEP[item.layer] === step);
    if (step === deciding) return [{ step, status: "decided", evidence }];
    if (evidence.length > 0) return [{ step, status: "passed", evidence }];
    if (deciding === null || step === "identity") return [];
    return [{ step, status: "skipped", evidence }];
  });
}
