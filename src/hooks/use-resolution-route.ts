"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

export const FACTS_PER_PAGE = 50;

export type ResolutionRoute = {
  /** Zero-indexed. */
  page: number;
  /** Id of the resolved fact whose trail is open, or `null` when none is. */
  factId: string | null;
  setPage: (page: number) => void;
  selectFact: (factId: string) => void;
  clearSelection: () => void;
};

/**
 * Single owner of the resolution view's URL contract: `?page=2&fact=<factId>`.
 *
 * Every writer goes through here so the table and the detail panel agree, and so an open
 * fact is a link someone can share. Changing page drops the selection, since a selected
 * row belongs to the page it was picked from.
 */
export function useResolutionRoute(): ResolutionRoute {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = Math.max(0, Number.parseInt(searchParams.get("page") ?? "", 10) || 0);
  const factId = searchParams.get("fact");

  const write = React.useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const next = new URLSearchParams(searchParams);
      mutate(next);
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const clearFact = (params: URLSearchParams) => params.delete("fact");

  const setPage = React.useCallback(
    (value: number) =>
      write((params) => {
        if (value <= 0) params.delete("page");
        else params.set("page", String(value));
        clearFact(params);
      }),
    [write],
  );

  const selectFact = React.useCallback(
    (value: string) => write((params) => params.set("fact", value)),
    [write],
  );

  const clearSelection = React.useCallback(() => write(clearFact), [write]);

  return { page, factId, setPage, selectFact, clearSelection };
}
