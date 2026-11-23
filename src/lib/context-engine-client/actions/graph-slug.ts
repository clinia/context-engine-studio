"use server";

import { defineAction } from "@/core/request-scope";
import type { FactNodeType } from "@/lib/context-engine-client/actions/graph";
import { MAX_GRAPH_PER_PAGE } from "@/lib/context-engine-client/graph-limits";
import { err, errorMessage, ok, type Result } from "@/lib/result";

/**
 * A fact's file name in a tree that names facts by slug: its display as a slug, cut to 50
 * characters, then the last eight alphanumerics of its id (`type_2_diabetes_k3j9x0aa`). Must
 * match the server's tree.
 */
function factSlug(display: string, id: string): string {
  const name = display
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 50);
  const suffix = id
    .replace(/[^a-z0-9]/gi, "")
    .slice(-8)
    .toLowerCase();
  return name ? `${name}_${suffix}` : suffix;
}

/**
 * Facts of `type`, keyed by their file name in a tree that names facts by slug. Reads the
 * first {@link MAX_GRAPH_PER_PAGE} only, so older facts past that are missing.
 */
export const listFactSlugs = defineAction(
  async (
    driver,
    patientId: string,
    type: FactNodeType,
  ): Promise<Result<Record<string, string>>> => {
    const { data, error } = await driver.getContextEngineClient().graph.queryFactNodes(patientId, {
      page: 0,
      perPage: MAX_GRAPH_PER_PAGE,
      filter: { type: { eq: type } },
    });
    if (error) return err(errorMessage(error));
    return ok(
      Object.fromEntries(
        (data?.data ?? []).flatMap(({ id, payload }) =>
          // TODO(CCE-1989): drop once laboratory is finalized and able to be rendered in the studio.
          payload.type === "laboratory" ? [] : [[factSlug(payload.display, id), id]],
        ),
      ),
    );
  },
);
