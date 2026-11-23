"use client";

import * as React from "react";

import { useVfsListingReader, type VfsLocation } from "@/contexts/vfs-listing-provider";
import { useActionResult } from "@/hooks/use-action-result";
import { ok } from "@/lib/result";
import { vfsPathOf, vfsSegments } from "@/lib/vfs-path";

export type VfsSegment = {
  name: string;
  /**
   * The name its parent's listing gives it, such as a condition's name for its `fct_…` id.
   * Undefined until the listings load, and null when listed without one or when a listing fails.
   */
  display: string | null | undefined;
};

/** Each segment of the location's path, with the display its parent's listing gives it. */
export function useVfsSegments(location: VfsLocation | null): VfsSegment[] {
  const readListing = useVfsListingReader();
  const patientId = location?.patientId;
  const path = location?.path;
  const names = React.useMemo(() => (path ? vfsSegments(path) : []), [path]);
  const load = React.useMemo(() => {
    if (!patientId || names.length === 0) return null;
    return async () =>
      ok(
        await Promise.all(
          names.map(async (name, index) => {
            const listing = await readListing({
              patientId,
              path: vfsPathOf(names.slice(0, index)),
            });
            if (!listing.ok) return null;
            return listing.data.children?.find((child) => child.name === name)?.display ?? null;
          }),
        ),
      );
  }, [patientId, names, readListing]);
  const state = useActionResult(load);
  return names.map((name, index) => ({
    name,
    display:
      state.status === "loaded" ? state.data[index] : state.status === "loading" ? undefined : null,
  }));
}
