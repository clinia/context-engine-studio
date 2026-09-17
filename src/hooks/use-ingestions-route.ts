"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import type { IngestionOrder } from "@/lib/context-engine-client/actions";
import type { IngestionStatus } from "@clinia/context-engine-js";

export const INGESTION_STATUSES: readonly IngestionStatus[] = [
  "pending",
  "processing",
  "succeeded",
  "partial",
  "failed",
];

export const DEFAULT_INGESTION_ORDER: IngestionOrder = "desc";
export const INGESTIONS_PER_PAGE = 50;

function isStatus(value: string): value is IngestionStatus {
  return (INGESTION_STATUSES as readonly string[]).includes(value);
}

export type IngestionsRoute = {
  /** Statuses to keep. Empty means unfiltered — the endpoint rejects an empty set. */
  status: IngestionStatus[];
  /** Direction of the `receivedAt` sort, the only one the endpoint offers. */
  order: IngestionOrder;
  /** Zero-indexed page. */
  page: number;
  /** Id of the submission whose detail panel is open, or `null` when closed. */
  selectedId: string | null;
  setStatus: (status: IngestionStatus[]) => void;
  setOrder: (order: IngestionOrder) => void;
  setPage: (page: number) => void;
  select: (ingestionId: string) => void;
  clearSelection: () => void;
};

/**
 * Single owner of the ingestions view's URL contract:
 * `?status=failed,partial&order=asc&page=2&ingestion=<id>`.
 *
 * Every writer goes through here so the toolbar, the table and the detail panel
 * agree, and so a filtered view is a link someone can share. Changing a filter
 * or the sort resets `page` — page 3 of the old result set describes nothing in
 * the new one — and drops the selection, which may not be in it either.
 */
export function useIngestionsRoute(): IngestionsRoute {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const status = React.useMemo(() => {
    const raw = searchParams.get("status");
    if (!raw) return [];
    return raw.split(",").filter(isStatus);
  }, [searchParams]);

  const order: IngestionOrder = searchParams.get("order") === "asc" ? "asc" : "desc";
  const page = Math.max(0, Number.parseInt(searchParams.get("page") ?? "", 10) || 0);
  const selectedId = searchParams.get("ingestion");

  const write = React.useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const next = new URLSearchParams(searchParams);
      mutate(next);
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const setStatus = React.useCallback(
    (value: IngestionStatus[]) =>
      write((params) => {
        if (value.length === 0) params.delete("status");
        else params.set("status", value.join(","));
        params.delete("page");
        params.delete("ingestion");
      }),
    [write],
  );

  const setOrder = React.useCallback(
    (value: IngestionOrder) =>
      write((params) => {
        if (value === DEFAULT_INGESTION_ORDER) params.delete("order");
        else params.set("order", value);
        params.delete("page");
        params.delete("ingestion");
      }),
    [write],
  );

  const setPage = React.useCallback(
    (value: number) =>
      write((params) => {
        if (value <= 0) params.delete("page");
        else params.set("page", String(value));
        params.delete("ingestion");
      }),
    [write],
  );

  const select = React.useCallback(
    (ingestionId: string) => write((params) => params.set("ingestion", ingestionId)),
    [write],
  );

  const clearSelection = React.useCallback(
    () => write((params) => params.delete("ingestion")),
    [write],
  );

  return {
    status,
    order,
    page,
    selectedId,
    setStatus,
    setOrder,
    setPage,
    select,
    clearSelection,
  };
}
