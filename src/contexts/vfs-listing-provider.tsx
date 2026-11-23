"use client";

import * as React from "react";

import { type ActionState, useActionResult } from "@/hooks/use-action-result";
import { browseVfs } from "@/lib/context-engine-client/actions";
import { attempt, type Result } from "@/lib/result";
import type { VfsPath } from "@/lib/vfs-path";
import type { BrowseResult } from "@clinia/context-engine-js";

/** A path in one patient's file tree. */
export type VfsLocation = { patientId: string; path: VfsPath };

type VfsListingReader = (location: VfsLocation) => Promise<Result<BrowseResult>>;

const VfsListingContext = React.createContext<VfsListingReader | null>(null);

/**
 * Directory listings of the patient file tree, fetched once and shared by the sidebar tree
 * and the file viewer. The root is `/`. A failed read is not kept, so the next call retries
 * it.
 */
export function useVfsListingReader(): VfsListingReader {
  const readListing = React.useContext(VfsListingContext);
  if (!readListing)
    throw new Error("useVfsListingReader must be used within a VfsListingProvider.");
  return readListing;
}

/** The shared listing of one location, idle while there is none. */
export function useVfsListing(location: VfsLocation | null): ActionState<BrowseResult> {
  const readListing = useVfsListingReader();
  const patientId = location?.patientId;
  const path = location?.path;
  const load = React.useMemo(
    () => (patientId && path ? () => readListing({ patientId, path }) : null),
    [patientId, path, readListing],
  );
  return useActionResult(load);
}

export function VfsListingProvider({ children }: { children: React.ReactNode }) {
  const cache = React.useRef(new Map<string, Promise<Result<BrowseResult>>>());

  const readListing = React.useCallback<VfsListingReader>(({ patientId, path }) => {
    const key = JSON.stringify([patientId, path]);
    const cached = cache.current.get(key);
    if (cached) return cached;
    const listing = attempt(browseVfs(patientId, path));
    cache.current.set(key, listing);
    void listing.then((result) => {
      if (!result.ok) cache.current.delete(key);
    });
    return listing;
  }, []);

  return <VfsListingContext.Provider value={readListing}>{children}</VfsListingContext.Provider>;
}
