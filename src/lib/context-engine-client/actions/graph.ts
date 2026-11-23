"use server";

import { defineAction } from "@/core/request-scope";
import { MAX_GRAPH_PER_PAGE } from "@/lib/context-engine-client/graph-limits";
import type {
  Coding,
  DecisionEdgePayload,
  FieldVerdict,
  SourceReference,
} from "@/lib/context-engine-client/graph-payloads";
import { err, errorMessage, ok, type Result } from "@/lib/result";
import type { ContextEngineClient, Edge, ResolutionDecisionEdge } from "@clinia/context-engine-js";

// `extracted_fact` records in, `fact` nodes out, one `resolution_decision` edge per pair.

const FACT_DECISIONS = { kind: { eq: "extracted_fact" } } as const;

/** Reads one page's `meta.total` without transferring the page itself. */
async function countNodes(
  client: ContextEngineClient,
  patientId: string,
  type: "extracted_fact" | "fact",
): Promise<Result<number>> {
  const { data, error } = await client.http.GET(
    "/v1/patients/{patientId}/graph/nodes/{type}/items",
    { params: { path: { patientId, type }, query: { page: 0, perPage: 1 } } },
  );
  if (error) return err(errorMessage(error));
  return ok(data?.meta.total ?? 0);
}

async function countDecisions(
  client: ContextEngineClient,
  patientId: string,
  verdict: "merge" | "reject",
): Promise<Result<number>> {
  const { data, error } = await client.graph.queryResolutionDecisionEdges(patientId, {
    page: 0,
    perPage: 1,
    filter: { ...FACT_DECISIONS, verdict: { eq: verdict } },
  });
  if (error) return err(errorMessage(error));
  return ok(data?.meta.total ?? 0);
}

/**
 * The four totals behind the impact strip. `merges` and `rejects` are decision counts:
 * a fact of three members is two merges.
 */
export type ResolutionImpact = {
  extracted: number;
  facts: number;
  merges: number;
  rejects: number;
};

export const readResolutionImpact = defineAction(
  async (driver, patientId: string): Promise<Result<ResolutionImpact>> => {
    const client = driver.getContextEngineClient();
    const [extracted, facts, merges, rejects] = await Promise.all([
      countNodes(client, patientId, "extracted_fact"),
      countNodes(client, patientId, "fact"),
      countDecisions(client, patientId, "merge"),
      countDecisions(client, patientId, "reject"),
    ]);

    if (!extracted.ok) return extracted;
    if (!facts.ok) return facts;
    if (!merges.ok) return merges;
    if (!rejects.ok) return rejects;

    return ok({
      extracted: extracted.data,
      facts: facts.data,
      merges: merges.data,
      rejects: rejects.data,
    });
  },
);

/** A resolved fact, the records it absorbed, and how they voted on each field. */
export type ResolvedFact = {
  id: string;
  type: string;
  display: string;
  /** Ids of the `extracted_fact` nodes the fact absorbed. */
  memberIds: string[];
  fieldVerdicts: Record<string, FieldVerdict>;
  /** The fact's own value for each field in `fieldVerdicts` — the value `picked` supplied. */
  fieldValues: Record<string, unknown>;
};

export type ResolvedFactPage = { facts: ResolvedFact[]; total: number };

/**
 * A page of the patient's resolved facts, in the graph's own order. The decisions behind
 * a fact are on the `resolution_decision` edges; see {@link readFactDecisions}.
 */
export const listResolvedFacts = defineAction(
  async (
    driver,
    patientId: string,
    query: { page?: number; perPage?: number } = {},
  ): Promise<Result<ResolvedFactPage>> => {
    const client = driver.getContextEngineClient();
    const { data, error } = await client.graph.queryFactNodes(patientId, {
      page: query.page ?? 0,
      perPage: query.perPage ?? 50,
    });
    if (error) return err(errorMessage(error));
    if (!data) return err("No data returned from the Context Engine API.");

    return ok({
      // TODO(CCE-1989): drop once laboratory is finalized and able to be rendered in the studio.
      facts: data.data.map(toResolvedFact).filter((fact) => fact !== null),
      total: data.meta.total,
    });
  },
);

type FactNode = NonNullable<
  Awaited<ReturnType<ContextEngineClient["graph"]["queryFactNodes"]>>["data"]
>["data"][number];

export type FactNodeType = FactNode["payload"]["type"];

/** Null for a laboratory fact, which the studio skips for now. */
function toResolvedFact({ id, payload }: FactNode): ResolvedFact | null {
  // TODO(CCE-1989): drop once laboratory is finalized and able to be rendered in the studio.
  if (payload.type === "laboratory") return null;
  // `fieldVerdicts` keys are field names on the payload's own variant.
  const fields: Record<string, unknown> = payload;
  return {
    id,
    type: payload.type,
    display: payload.display,
    memberIds: payload.members.map(({ extractedFactId }) => extractedFactId),
    fieldVerdicts: payload.fieldVerdicts,
    fieldValues: Object.fromEntries(
      Object.keys(payload.fieldVerdicts).map((field) => [field, fields[field]]),
    ),
  };
}

/** One resolved fact by id. Null when the patient has no such fact. */
export const readResolvedFact = defineAction(
  async (driver, patientId: string, factId: string): Promise<Result<ResolvedFact | null>> => {
    const client = driver.getContextEngineClient();
    const { data, error } = await client.graph.queryFactNodes(patientId, {
      page: 0,
      perPage: 1,
      filter: { id: { eq: factId } },
    });
    if (error) return err(errorMessage(error));
    const node = data?.data[0];
    return ok(node ? toResolvedFact(node) : null);
  },
);

/** One recorded verdict on one compared pair, as a `resolution_decision` edge carries it. */
export type FactDecision = {
  edgeId: string;
  fromId: string;
  toId: string;
  decision: DecisionEdgePayload;
};

export type FactDecisions = {
  /** Merges between two of the fact's own records: how it came to be. */
  merges: FactDecision[];
  /** True when the fact has more members than were probed; the groups then cover part of it. */
  truncated: boolean;
  /** Members whose decisions were read. */
  probed: number;
};

function isDecision(edge: Edge): edge is ResolutionDecisionEdge {
  return edge.type === "resolution_decision";
}

/** How many graph reads run at once when a view needs one call per id. */
const GRAPH_READ_CONCURRENCY = 12;

/** Members whose decisions are read. Larger facts are reported as `truncated`. */
const MAX_PROBED_MEMBERS = 40;

/** Records read per call: the most ids one `extracted_fact` query matches. The rest fall back to their ids. */
const MAX_RECORDS_READ = 500;

/**
 * The merges between one fact's own members, deduplicated by edge id. Reads the first
 * {@link MAX_GRAPH_PER_PAGE} decisions per member, rejects included.
 */
export const readFactDecisions = defineAction(
  async (driver, patientId: string, memberIds: string[]): Promise<Result<FactDecisions>> => {
    const client = driver.getContextEngineClient();
    const members = [...new Set(memberIds)];
    const probed = members.slice(0, MAX_PROBED_MEMBERS);
    const inCluster = new Set(members);
    const merged = new Map<string, FactDecision>();

    for (let start = 0; start < probed.length; start += GRAPH_READ_CONCURRENCY) {
      const batch = probed.slice(start, start + GRAPH_READ_CONCURRENCY);
      const pages = await Promise.all(
        batch.map((id) =>
          client.http.GET("/v1/patients/{patientId}/graph/edges/{type}/items", {
            params: {
              path: { patientId, type: "resolution_decision" },
              query: { page: 0, perPage: MAX_GRAPH_PER_PAGE, touching: id },
            },
          }),
        ),
      );

      for (const { data, error } of pages) {
        if (error) return err(errorMessage(error));
        for (const edge of data?.data.filter(isDecision) ?? []) {
          if (edge.payload.verdict !== "merge") continue;
          if (!inCluster.has(edge.from.id) || !inCluster.has(edge.to.id)) continue;
          merged.set(edge.id, {
            edgeId: edge.id,
            fromId: edge.from.id,
            toId: edge.to.id,
            decision: edge.payload,
          });
        }
      }
    }

    return ok({
      merges: [...merged.values()],
      truncated: members.length > probed.length,
      probed: probed.length,
    });
  },
);

/** One extracted record, with the codes an exact-code merge compared. */
export type ExtractedRecord = {
  id: string;
  display: string;
  type: string;
  status: string | null;
  codes: Coding[];
  /** An instant, a range, or `null` — whichever the record dated itself with. */
  when: { start: string | null; end: string | null } | null;
  source: SourceReference;
};

/** The extracted records behind a set of ids, keyed by id, in one query. Unreadable ids are left out. */
export const readExtractedFacts = defineAction(
  async (
    driver,
    patientId: string,
    ids: string[],
  ): Promise<Result<Record<string, ExtractedRecord>>> => {
    const client = driver.getContextEngineClient();
    const unique = [...new Set(ids)].slice(0, MAX_RECORDS_READ);
    if (unique.length === 0) return ok({});

    const { data, error } = await client.graph.queryExtractedFactNodes(patientId, {
      page: 0,
      perPage: unique.length,
      filter: { id: { any: unique } },
    });
    if (error) return err(errorMessage(error));

    const records: Record<string, ExtractedRecord> = {};
    for (const { id, payload } of data?.data ?? []) {
      // TODO(CCE-1989): drop once laboratory is finalized and rendered in the studio.
      if (payload.type === "laboratory") continue;
      const date = "date" in payload && typeof payload.date === "string" ? payload.date : undefined;
      const period = "effectivePeriod" in payload ? payload.effectivePeriod : undefined;
      records[id] = {
        id,
        display: payload.display,
        type: payload.type,
        status: "status" in payload ? (payload.status ?? null) : null,
        codes: payload.codes ?? [],
        when: date
          ? { start: date, end: null }
          : period
            ? { start: period.start ?? null, end: period.end ?? null }
            : null,
        source: payload.source,
      };
    }

    return ok(records);
  },
);
